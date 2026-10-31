import unittest
from datetime import datetime, timedelta

from app.services.report_service import _build_chart_points, _build_records, _build_zone_metrics


class ReportServiceTests(unittest.TestCase):
    def test_recent_analysis_points_use_latest_eight(self):
        analyses = [
            {"id_analisis": number, "zone_code": "A", "porcentaje_ocupacion": 50}
            for number in range(20, 0, -1)
        ]

        points = _build_chart_points(analyses)

        self.assertEqual([point["id"] for point in points], list(range(20, 12, -1)))

    def test_zone_metrics_keep_each_zone_review_and_unknown_count(self):
        overview = {"zones": [
            {
                "id": "A", "title": "Estacionamiento A", "total_spaces": 46,
                "free_spaces": 17, "occupied_spaces": 29, "unknown_spaces": 0,
                "analysis_available": True, "updated_at": "2026-10-30T10:00:00Z",
            },
            {
                "id": "B", "title": "Estacionamiento B", "total_spaces": 73,
                "free_spaces": 37, "occupied_spaces": 35, "unknown_spaces": 1,
                "analysis_available": True, "updated_at": "2026-10-29T10:00:00Z",
            },
        ]}

        zones = _build_zone_metrics([], overview)

        self.assertEqual(zones[0]["last_review"], "2026-10-30T10:00:00Z")
        self.assertEqual(zones[1]["last_review"], "2026-10-29T10:00:00Z")
        self.assertEqual(zones[1]["unknown_spaces"], 1)

    def test_historical_mobile_events_are_not_pending_confirmations(self):
        past = (datetime.utcnow() - timedelta(days=2)).isoformat()
        events = [
            {"event_type": "occupy", "space_code": "B-002", "confirmation_due_at": past},
            {"event_type": "release", "space_code": "B-002", "confirmation_due_at": past},
        ]

        records = _build_records([], events, {})

        self.assertEqual([record["confirmation"] for record in records], ["-", "-"])
