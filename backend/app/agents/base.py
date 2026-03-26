from abc import ABC, abstractmethod
from typing import AsyncGenerator
from app.services.job_runner import publish_event, update_job_status


class BaseAgent(ABC):
    def __init__(self, job_id: str):
        self.job_id = job_id

    async def emit(self, step: str, status: str, message: str, partial_output=None):
        event = {
            "event": "step",
            "step": step,
            "status": status,
            "message": message,
            "partial_output": partial_output,
        }
        update_job_status(self.job_id, "RUNNING", step=step)
        await publish_event(self.job_id, event)

    async def emit_done(self, result_url: str = None):
        event = {
            "event": "done",
            "job_id": self.job_id,
            "result_url": result_url or f"/api/v1/jobs/{self.job_id}/result",
        }
        await publish_event(self.job_id, event)

    @abstractmethod
    async def run(self, input_data: dict) -> AsyncGenerator[dict, None]:
        pass
