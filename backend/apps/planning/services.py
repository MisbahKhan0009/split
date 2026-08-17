"""Planning-domain service boundaries.

The current MVP stores planning UI state locally. These service names define the
stable seam for moving itinerary, vote, and task persistence into this domain.
"""


def build_group_plan(*, group_id: int) -> dict:
    return {"group_id": group_id, "items": [], "status": "ready"}
