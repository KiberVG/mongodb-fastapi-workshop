import os
from typing import List

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, EmailStr

from bson import ObjectId # Mongo uses bson, ObjectId is the type for ids in mongo
from pymongo import AsyncMongoClient
from pymongo import ReturnDocument
from dotenv import load_dotenv

# Just need to do pip install pymongo and pip install "fastapi[standard]"
# Ignore requirements.txt

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise RuntimeError("MONGO_URL is not set. Add it to your environment or .env file.")

app = FastAPI(
    title="Student Course API",
    summary="A sample application showing how to use FastAPI to add a ReST API to a MongoDB collection.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncMongoClient(MONGO_URL)
db = client.college
student_collection = db.get_collection("students")

def parse_user_id(user_id: str) -> ObjectId:
    """
    Convert a user-facing `user_id` string to a MongoDB ObjectId.
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail=f"Invalid user_id: {user_id}")
    return ObjectId(user_id)


def student_doc_to_api(student_doc: dict) -> dict:
    """
    Convert a MongoDB student document into API response shape.
    """
    api_student = dict(student_doc)
    api_student["user_id"] = str(api_student.pop("_id"))
    return api_student

class StudentModel(BaseModel):
    """
    Container for a single student record.
    """
    user_id: str | None = None
    name: str = Field(...) # ... means this is requirede
    email: EmailStr = Field(...)
    course: str = Field(...)
    gpa: float = Field(..., le=4.0) # less than


class UpdateStudentModel(BaseModel):
    """
    A set of optional updates to be made to a document in the database.
    """
    name: str | None = None
    email: EmailStr | None = None
    course: str | None = None
    gpa: float | None = None


class StudentCollection(BaseModel):
    """
    A container holding a list of `StudentModel` instances.

    This exists because providing a top-level array in a JSON response can be a [vulnerability](https://haacked.com/archive/2009/06/25/json-hijacking.aspx/)
    """

    students: List[StudentModel]


@app.post(
    "/students/",
    response_description="Add new student",
    response_model=StudentModel, # Return value
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=False, # 'Use the alias name when returning to the user'
)
async def create_student(student: StudentModel):
    """
    Insert a new student record.

    A unique `user_id` will be created and provided in the response.
    """
    new_student = student.model_dump(exclude={"user_id"}) 
    result = await student_collection.insert_one(new_student)
    new_student["_id"] = result.inserted_id

    return student_doc_to_api(new_student)


@app.get(
    "/students/",
    response_description="List all students",
    response_model=StudentCollection,
    response_model_by_alias=False,
)
async def list_students():
    """
    List all of the student data in the database.

    The response is unpaginated and limited to 1000 results.
    """
    students = await student_collection.find().to_list(1000)
    return StudentCollection(students=[student_doc_to_api(student) for student in students])


@app.get(
    "/students/{user_id}",
    response_description="Get a single student",
    response_model=StudentModel,
    response_model_by_alias=False,
)
async def show_student(user_id: str):
    """
    Get the record for a specific student, looked up by `user_id`.
    """
    mongo_id = parse_user_id(user_id)
    if (student := await student_collection.find_one({"_id": mongo_id})) is not None:
        return student_doc_to_api(student)

    raise HTTPException(status_code=404, detail=f"Student {user_id} not found")


@app.put(
    "/students/{user_id}",
    response_description="Update a student",
    response_model=StudentModel,
    response_model_by_alias=False,
)
async def update_student(user_id: str, student: UpdateStudentModel):
    """
    Update individual fields of an existing student record.

    Only the provided fields will be updated.
    Any missing or `null` fields will be ignored.
    """
    mongo_id = parse_user_id(user_id)
    student = {
        k: v for k, v in student.model_dump().items() if v is not None
    }

    if len(student) >= 1:
        update_result = await student_collection.find_one_and_update(
            {"_id": mongo_id},
            {"$set": student},
            return_document=ReturnDocument.AFTER,
        )
        if update_result is not None:
            return student_doc_to_api(update_result)
        else:
            raise HTTPException(status_code=404, detail=f"Student {user_id} not found")

    # The update is empty, but we should still return the matching document:
    if (existing_student := await student_collection.find_one({"_id": mongo_id})) is not None:
        return student_doc_to_api(existing_student)

    raise HTTPException(status_code=404, detail=f"Student {user_id} not found")


@app.delete("/students/{user_id}", response_description="Delete a student")
async def delete_student(user_id: str):
    """
    Remove a single student record from the database.
    """
    print(user_id)
    print(type(user_id))
    mongo_id = parse_user_id(user_id)
    print(mongo_id)
    delete_result = await student_collection.delete_one({"_id": mongo_id})

    if delete_result.deleted_count == 1:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    raise HTTPException(status_code=404, detail=f"Student {user_id} not found")
