from fastapi import APIRouter, Depends, HTTPException
from app.connectors.jira import JiraConnector
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/story/{story_id}")
async def get_jira_story(story_id: str, user=Depends(get_current_user)):
    try:
        connector = JiraConnector()
        story = await connector.get_story_simplified(story_id)
        return story
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Jira story not found: {story_id}")
