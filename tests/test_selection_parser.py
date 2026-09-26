import pytest
from backend.utils.selection_parser import parse_selection


def test_individual_videos():
    assert parse_selection("1, 4, 7, 12") == [1, 4, 7, 12]


def test_single_range():
    assert parse_selection("1-10") == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]


def test_multiple_ranges():
    assert parse_selection("1-5, 10-15") == [1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15]


def test_mixed():
    assert parse_selection("1, 4, 8-12, 20") == [1, 4, 8, 9, 10, 11, 12, 20]


def test_whitespace():
    assert parse_selection("1 , 4 , 7") == [1, 4, 7]


def test_deduplication():
    assert parse_selection("1, 1, 4, 4") == [1, 4]


def test_all():
    assert parse_selection("all", max_videos=5) == [1, 2, 3, 4, 5]


def test_invalid_zero():
    with pytest.raises(ValueError):
        parse_selection("0, 1, 5")


def test_invalid_negative():
    with pytest.raises(ValueError):
        parse_selection("-1, 1, 5")


def test_out_of_range():
    with pytest.raises(ValueError):
        parse_selection("1, 500", max_videos=50)


def test_invalid_syntax():
    with pytest.raises(ValueError):
        parse_selection("1-5-10")
    with pytest.raises(ValueError):
        parse_selection("abc")
    with pytest.raises(ValueError):
        parse_selection("1--5")
    with pytest.raises(ValueError):
        parse_selection("5-2")
