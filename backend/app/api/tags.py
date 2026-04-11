from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.album import PhotoTag, Tag
from app.models.photo import Photo

router = APIRouter(prefix="/api", tags=["tags"])


class TagCreateRequest(BaseModel):
    name: str


class AddPhotoTagsRequest(BaseModel):
    tag_ids: list[int]


class TagListResponse(BaseModel):
    items: list[Tag]


class OkResponse(BaseModel):
    ok: bool


def normalize_tag_name(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Tag name is required")

    return normalized


def get_photo_or_404(photo_id: int, session: Session) -> Photo:
    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    return photo


def get_tag_or_404(tag_id: int, session: Session) -> Tag:
    tag = session.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    return tag


@router.post("/tags", response_model=Tag, status_code=201)
def create_tag(request: TagCreateRequest, session: Session = Depends(get_session)) -> Tag:
    tag_name = normalize_tag_name(request.name)

    existing = session.exec(
        select(Tag).where(func.lower(Tag.name) == tag_name.lower())
    ).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Tag already exists")

    tag = Tag(name=tag_name)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return tag


@router.get("/tags", response_model=TagListResponse)
def list_tags(session: Session = Depends(get_session)) -> TagListResponse:
    tags = session.exec(select(Tag).order_by(Tag.name.asc())).all()
    return TagListResponse(items=tags)


@router.delete("/tags/{tag_id}", response_model=OkResponse)
def delete_tag(tag_id: int, session: Session = Depends(get_session)) -> OkResponse:
    tag = get_tag_or_404(tag_id, session)

    session.exec(delete(PhotoTag).where(PhotoTag.tag_id == tag_id))
    session.delete(tag)
    session.commit()

    return OkResponse(ok=True)


@router.post("/photos/{photo_id}/tags", response_model=OkResponse)
def add_tags_to_photo(
    photo_id: int,
    request: AddPhotoTagsRequest,
    session: Session = Depends(get_session),
) -> OkResponse:
    get_photo_or_404(photo_id, session)

    requested_tag_ids = list(dict.fromkeys(request.tag_ids))
    if not requested_tag_ids:
        return OkResponse(ok=True)

    existing_tag_ids = set(
        session.exec(select(Tag.id).where(Tag.id.in_(requested_tag_ids))).all()
    )
    missing_tag_ids = [tag_id for tag_id in requested_tag_ids if tag_id not in existing_tag_ids]
    if missing_tag_ids:
        raise HTTPException(status_code=404, detail="Tag not found")

    existing_links = set(
        session.exec(
            select(PhotoTag.tag_id).where(
                PhotoTag.photo_id == photo_id,
                PhotoTag.tag_id.in_(requested_tag_ids),
            )
        ).all()
    )

    for tag_id in requested_tag_ids:
        if tag_id in existing_links:
            continue
        session.add(PhotoTag(photo_id=photo_id, tag_id=tag_id))

    session.commit()
    return OkResponse(ok=True)


@router.delete("/photos/{photo_id}/tags/{tag_id}", response_model=OkResponse)
def remove_tag_from_photo(
    photo_id: int,
    tag_id: int,
    session: Session = Depends(get_session),
) -> OkResponse:
    get_photo_or_404(photo_id, session)

    link = session.exec(
        select(PhotoTag).where(
            PhotoTag.photo_id == photo_id,
            PhotoTag.tag_id == tag_id,
        )
    ).first()
    if link is not None:
        session.delete(link)
        session.commit()

    return OkResponse(ok=True)


@router.get("/photos/{photo_id}/tags", response_model=TagListResponse)
def list_photo_tags(photo_id: int, session: Session = Depends(get_session)) -> TagListResponse:
    get_photo_or_404(photo_id, session)

    tags = session.exec(
        select(Tag)
        .join(PhotoTag, PhotoTag.tag_id == Tag.id)
        .where(PhotoTag.photo_id == photo_id)
        .order_by(Tag.name.asc())
    ).all()
    return TagListResponse(items=tags)

