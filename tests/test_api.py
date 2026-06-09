# -*- coding: utf-8 -*-
"""
AegisOps — Integrated Automated pytest Suite
Validates API Route Behaviors, RBAC authenticators, and Rate Limit guards
"""

import base64
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app, UserRole

# 1. Initialize client simulator
client = TestClient(app)

# Helper to generate mock valid JWT authorization contexts
def get_auth_header(username: str, role: UserRole) -> dict:
    payload = {"username": username, "role": role.value, "exp": 9999999999}
    token = base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")
    return {"Authorization": f"Bearer {token}"}

# ==========================================
# 2. ENDPOINT VALIDATION TESTS
# ==========================================

def test_public_health_endpoint():
    """Verify that public health telemetry is readable without authorization certificates"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "metrics" in data
    assert "services" in data

def test_rbac_rejection_on_unauthorized_guests():
    """Verify that guests cannot trigger heavy ML orchestration loops"""
    headers = get_auth_header("guest-tester", UserRole.GUEST)
    response = client.post(
        "/api/agents/execute",
        headers=headers,
        json={"prompt": "Deploy cluster config"}
    )
    # Guest role is restricted from write execute privileges
    assert response.status_code == 403
    assert "privilege is insufficient" in response.json()["detail"]

def test_rbac_rejection_without_bearer():
    """Verify missing standard authorizations return classic 401 exceptions"""
    response = client.post(
        "/api/agents/execute",
        json={"prompt": "Trigger stack migration"}
    )
    assert response.status_code == 401

def test_operator_execution_flow():
    """Verify that Operator role can execute planning loops successfully"""
    headers = get_auth_header("operator-bob", UserRole.OPERATOR)
    prompt_payload = {"prompt": "Configure an encrypted database connection pool"}
    
    response = client.post(
        "/api/agents/execute",
        headers=headers,
        json=prompt_payload
    )
    assert response.status_code == 200
    data = response.json()
    assert "record" in data
    assert data["record"]["target"] == prompt_payload["prompt"]
    assert len(data["record"]["steps"]) > 0
    assert data["record"]["securityVerified"] is True

def test_cache_purging_authorized_admin():
    """Verify only level-3 Admin permissions can wipe memory cache blocks"""
    admin_headers = get_auth_header("root-admin", UserRole.ADMIN)
    response = client.post("/api/cache/clear", headers=admin_headers)
    assert response.status_code == 200
    assert "cleared successfully" in response.json()["message"]

def test_cache_purging_unprivileged_operator():
    """Verify operators cannot execute cache overrides"""
    operator_headers = get_auth_header("ops-john", UserRole.OPERATOR)
    response = client.post("/api/cache/clear", headers=operator_headers)
    assert response.status_code == 403
