from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Server is working!"}

if __name__ == "__main__":
    print("🚀 Starting test server on http://127.0.0.1:8000")
    uvicorn.run("test_server:app", host="127.0.0.1", port=8000, reload=True)
