from services.surge import Capacity, forecast, simulate


def test_forecast_marks_icu_as_critical_when_capacity_is_nearly_exhausted():
    result = forecast(Capacity(20, 18), Capacity(100, 50), hours=8, hourly_critical=0.25)
    assert result["icu"]["available"] == 0
    assert result["icu"]["risk"] == "exhausted"


def test_simulation_keeps_critical_arrivals_in_icu_and_other_arrivals_in_general_ward():
    result = simulate(Capacity(20, 10), Capacity(100, 70), critical=4, moderate=12, low=3, hours=12)
    assert result["icu"]["occupied"] == 14
    assert result["general"]["occupied"] == 85
    assert result["incoming"] == {"critical": 4, "moderate": 12, "low": 3}
