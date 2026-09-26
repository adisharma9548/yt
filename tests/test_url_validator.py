from backend.utils.url_validator import (
    is_youtube_url,
    extract_video_id,
    extract_playlist_id,
    parse_youtube_url,
)


def test_valid_video_url():
    assert is_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert is_youtube_url("https://youtu.be/dQw4w9WgXcQ")
    assert is_youtube_url("https://youtube.com/shorts/dQw4w9WgXcQ")


def test_valid_playlist_url():
    assert is_youtube_url("https://www.youtube.com/playlist?list=PLrAXtmErZgOdP_8GztsuKi9nvOGQofMR4")


def test_invalid_url():
    assert not is_youtube_url("https://example.com/video")
    assert not is_youtube_url("not a url")
    assert not is_youtube_url("https://vimeo.com/12345678")


def test_extract_video_id():
    assert extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_video_id("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s") == "dQw4w9WgXcQ"
    assert extract_video_id("https://youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"


def test_extract_playlist_id():
    assert extract_playlist_id("https://www.youtube.com/playlist?list=PLrAXtmErZgOdP_8GztsuKi9nvOGQofMR4") == "PLrAXtmErZgOdP_8GztsuKi9nvOGQofMR4"


def test_parse_youtube_url():
    res1 = parse_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert res1["valid"] is True
    assert res1["type"] == "video"
    assert res1["video_id"] == "dQw4w9WgXcQ"

    res2 = parse_youtube_url("https://www.youtube.com/playlist?list=PLrAXtmErZgOdP_8GztsuKi9nvOGQofMR4")
    assert res2["valid"] is True
    assert res2["type"] == "playlist"
    assert res2["playlist_id"] == "PLrAXtmErZgOdP_8GztsuKi9nvOGQofMR4"

    res3 = parse_youtube_url("https://example.com/test")
    assert res3["valid"] is False
    assert "not appear to be a valid YouTube link" in res3["error"]
