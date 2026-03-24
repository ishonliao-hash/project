"""AI-powered film editing service using Claude."""
import json
import os
import anthropic
from typing import List, AsyncIterator
from ..models.schemas import Scene, EditDecision, EditPlan, Project
import uuid
import logging

logger = logging.getLogger(__name__)

client = anthropic.AsyncAnthropic()

SYSTEM_PROMPT = """You are an expert film editor with decades of experience in narrative storytelling,
pacing, and cinematic technique. You analyze raw footage scenes and craft compelling edit plans
that bring the director's vision to life.

When given a list of scenes and a description of the desired film, you:
1. Analyze each scene's content, duration, and potential
2. Select the best moments from each scene (in/out points)
3. Determine the optimal scene order for narrative flow
4. Choose appropriate transitions (cut, dissolve, fade)
5. Consider pacing — when to linger, when to cut quickly
6. Explain your editorial decisions clearly

Always output a valid JSON edit plan with this structure:
{
  "summary": "Brief summary of the overall edit approach",
  "reasoning": "Detailed explanation of editorial choices and narrative structure",
  "decisions": [
    {
      "scene_id": "<scene_id>",
      "scene_filename": "<filename>",
      "order": 1,
      "in_point": 0.0,
      "out_point": 0.0,
      "transition_type": "cut",
      "transition_duration": 0.5,
      "ai_notes": "Why this moment was chosen and how it serves the story"
    }
  ]
}

transition_type options: "cut", "dissolve", "fade_in", "fade_out", "wipe"
- Use "cut" for most transitions (clean, immediate)
- Use "dissolve" for time passing or emotional transitions
- Use "fade_in" / "fade_out" for opening/closing
- in_point and out_point of 0.0 means use the full clip
- Order scenes thoughtfully — consider narrative arc, pacing, and emotional journey"""


def _build_scene_description(scene: Scene) -> str:
    """Format scene info for the AI prompt."""
    meta = scene.metadata
    parts = [f"- Scene ID: {scene.id}"]
    parts.append(f"  Filename: {scene.original_filename}")
    parts.append(f"  Duration: {scene.duration:.1f}s")
    if scene.width and scene.height:
        parts.append(f"  Resolution: {scene.width}x{scene.height}")
    if meta.shot_type:
        parts.append(f"  Shot type: {meta.shot_type}")
    if meta.location:
        parts.append(f"  Location: {meta.location}")
    if meta.notes:
        parts.append(f"  Notes: {meta.notes}")
    if meta.tags:
        parts.append(f"  Tags: {', '.join(meta.tags)}")
    return "\n".join(parts)


async def generate_edit_plan(project: Project, description: str = None) -> EditPlan:
    """
    Generate an AI edit plan for the project using Claude with adaptive thinking.
    Returns a complete EditPlan.
    """
    vision = description or project.description or "Create a compelling, well-paced film"

    if not project.scenes:
        raise ValueError("Project has no scenes to edit")

    scene_descriptions = "\n\n".join(
        _build_scene_description(s) for s in project.scenes
    )

    user_message = f"""I need you to create an edit plan for my film.

## My Vision
{vision}

## Available Scenes ({len(project.scenes)} total)
{scene_descriptions}

Please analyze these scenes and create an edit plan that brings my vision to life.
Consider the narrative arc, pacing, and emotional journey. Select the best moments
from each scene and arrange them for maximum impact.

Output ONLY the JSON edit plan — no other text."""

    logger.info(f"Generating edit plan for project {project.id} with {len(project.scenes)} scenes")

    try:
        async with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=8000,
            thinking={"type": "adaptive"},
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}]
        ) as stream:
            final_message = await stream.get_final_message()

        # Extract text from response
        response_text = ""
        for block in final_message.content:
            if block.type == "text":
                response_text = block.text
                break

        # Parse JSON from response
        # Handle potential markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        plan_data = json.loads(response_text)

        decisions = []
        for i, d in enumerate(plan_data.get("decisions", [])):
            # Find the scene to get its filename
            scene = next(
                (s for s in project.scenes if s.id == d.get("scene_id")),
                None
            )
            if not scene:
                # Try matching by filename
                scene = next(
                    (s for s in project.scenes
                     if s.filename == d.get("scene_filename") or
                     s.original_filename == d.get("scene_filename")),
                    None
                )
            if not scene and project.scenes:
                # Fallback: use order index
                idx = min(i, len(project.scenes) - 1)
                scene = project.scenes[idx]

            if scene:
                out_pt = float(d.get("out_point", 0.0))
                # Clamp out_point to scene duration
                if out_pt > scene.duration:
                    out_pt = scene.duration

                decisions.append(EditDecision(
                    id=str(uuid.uuid4()),
                    scene_id=scene.id,
                    scene_filename=scene.filename,
                    order=d.get("order", i + 1),
                    in_point=float(d.get("in_point", 0.0)),
                    out_point=out_pt,
                    transition_type=d.get("transition_type", "cut"),
                    transition_duration=float(d.get("transition_duration", 0.5)),
                    ai_notes=d.get("ai_notes", "")
                ))

        # Sort by order
        decisions.sort(key=lambda x: x.order)

        # Calculate total duration
        total_duration = sum(
            (d.out_point - d.in_point) if d.out_point > 0 else
            next((s.duration for s in project.scenes if s.id == d.scene_id), 0)
            for d in decisions
        )

        return EditPlan(
            project_id=project.id,
            decisions=decisions,
            ai_summary=plan_data.get("summary", "AI-generated edit plan"),
            ai_reasoning=plan_data.get("reasoning", ""),
            total_duration=total_duration
        )

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}\nResponse: {response_text[:500]}")
        # Return a fallback plan using all scenes in order
        return _generate_fallback_plan(project)
    except Exception as e:
        logger.error(f"AI editing error: {e}")
        raise


async def stream_edit_thinking(project: Project, description: str = None) -> AsyncIterator[str]:
    """
    Stream the AI's thinking process as it generates the edit plan.
    Yields chunks of text (thinking + final response).
    """
    vision = description or project.description or "Create a compelling, well-paced film"

    if not project.scenes:
        yield "Error: No scenes available to edit."
        return

    scene_descriptions = "\n\n".join(
        _build_scene_description(s) for s in project.scenes
    )

    user_message = f"""I need you to create an edit plan for my film.

## My Vision
{vision}

## Available Scenes ({len(project.scenes)} total)
{scene_descriptions}

Please analyze these scenes and create an edit plan that brings my vision to life.
Output ONLY the JSON edit plan — no other text."""

    async with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=8000,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    ) as stream:
        async for event in stream:
            if event.type == "content_block_delta":
                if event.delta.type == "thinking_delta":
                    yield f"THINKING:{event.delta.thinking}"
                elif event.delta.type == "text_delta":
                    yield f"TEXT:{event.delta.text}"


def _generate_fallback_plan(project: Project) -> EditPlan:
    """Generate a simple fallback plan using all scenes in order."""
    decisions = []
    for i, scene in enumerate(project.scenes):
        decisions.append(EditDecision(
            id=str(uuid.uuid4()),
            scene_id=scene.id,
            scene_filename=scene.filename,
            order=i + 1,
            in_point=0.0,
            out_point=0.0,
            transition_type="cut" if i > 0 else "fade_in",
            transition_duration=0.5,
            ai_notes="Fallback: scenes arranged in upload order"
        ))

    total_duration = sum(s.duration for s in project.scenes)

    return EditPlan(
        project_id=project.id,
        decisions=decisions,
        ai_summary="Fallback edit plan — scenes in upload order",
        ai_reasoning="AI parsing failed. Using all scenes in upload order as a fallback.",
        total_duration=total_duration
    )
