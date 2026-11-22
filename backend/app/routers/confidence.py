from fastapi import APIRouter
router = APIRouter(tags=["confidence"])
AUTO_FIRST_PASS = 0.90  # configurable rule; officers still approve the full record

@router.get("/confidence/route")
def route(confidence: float):
    return {"route": "first_pass_eligible" if confidence >= AUTO_FIRST_PASS else "officer_queue"}
