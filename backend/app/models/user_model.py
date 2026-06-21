from pydantic import BaseModel, EmailStr, Field


class UserCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    joined_at: str

