"""Tests für Cluster-Compute-Aggregation (Hypervisor-Sicht)."""

import pytest

from cluster_compute import aggregate_cluster_compute


def test_aggregate_two_nodes_top_load_and_memory_split():
    rows = [
        {
            "node": "a",
            "online": True,
            "cpu": 0.9,
            "maxcpu": 10,
            "mem": 10,
            "maxmem": 100,
        },
        {
            "node": "b",
            "online": True,
            "cpu": 0.1,
            "maxcpu": 10,
            "mem": 80,
            "maxmem": 100,
        },
    ]
    agg, top, top_mem = aggregate_cluster_compute(rows)
    assert agg is not None
    assert agg.cpu_total_cores == 20
    assert agg.cpu_used_cores == pytest.approx(10.0)  # 0.9*10 + 0.1*10
    assert agg.cpu_percent == pytest.approx(50.0)
    assert agg.ram_percent == pytest.approx(45.0)
    assert agg.nodes_online == 2

    # Node a: cpu 90%, mem 10% -> load 0.6*90 + 0.4*10 = 58
    # Node b: cpu 10%, mem 80% -> load 0.6*10 + 0.4*80 = 38
    assert top is not None
    assert top.node == "a"
    assert top_mem is not None
    assert top_mem.node == "b"


def test_top_node_memory_none_when_same_node():
    rows = [
        {"node": "solo", "online": True, "cpu": 0.5, "maxcpu": 8, "mem": 4, "maxmem": 8},
    ]
    agg, top, top_mem = aggregate_cluster_compute(rows)
    assert agg.nodes_online == 1
    assert top.node == "solo"
    assert top_mem is None


def test_offline_only_returns_none():
    rows = [
        {"node": "x", "online": False, "cpu": 0.99, "maxcpu": 4, "mem": 1, "maxmem": 8},
    ]
    assert aggregate_cluster_compute(rows) == (None, None, None)

