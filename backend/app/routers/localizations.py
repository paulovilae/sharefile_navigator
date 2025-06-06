from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_localizations():
    return {"message": "Localization settings go here"}