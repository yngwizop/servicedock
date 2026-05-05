from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_root_health():
  app = FastAPI()

  @app.get("/")
  def root():
    return {"status": "running"}

  client = TestClient(app)
  r = client.get("/")
  assert r.status_code == 200
  assert r.json()["status"] == "running"

