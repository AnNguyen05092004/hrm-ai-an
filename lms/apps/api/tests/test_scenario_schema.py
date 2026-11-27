import pytest
from pydantic import ValidationError

from app.modules.courses.schemas import ScenarioDraft


def _draft(ok: str) -> dict:
    return {"character": {"name": "Lan", "role": "Khách"}, "learner": "Nhân viên", "intro": "x",
            "scenes": [{"title": "a", "goal": "b", "line": "c", "choices": [{"t": "t", "ok": ok, "reply": "r"}]}]}


@pytest.mark.parametrize("ok", ["good", "neutral", "bad"])
def test_same_ratings_as_scenario_editor(ok):
    ScenarioDraft.model_validate(_draft(ok))


def test_rejects_ratings_editor_cannot_show():
    with pytest.raises(ValidationError):
        ScenarioDraft.model_validate(_draft("ok"))
