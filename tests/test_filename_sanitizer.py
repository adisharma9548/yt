from backend.utils.filename_sanitizer import sanitize_filename, generate_filename


def test_remove_invalid_chars():
    assert sanitize_filename("Video: The <Best>.mp4") == "Video The Best.mp4"


def test_remove_windows_reserved():
    # Windows reserved word CON should be escaped
    assert sanitize_filename("CON.mp4") != "CON.mp4"
    assert sanitize_filename("AUX.mp4") != "AUX.mp4"
    assert sanitize_filename("NUL.mp4") != "NUL.mp4"


def test_long_filename():
    long_title = "a" * 300
    result = sanitize_filename(long_title)
    assert len(result) <= 255


def test_unicode():
    result = sanitize_filename("Видео 中文 🎬.mp4")
    assert "Видео" in result
    assert "中文" in result


def test_empty_after_sanitization():
    result = sanitize_filename("***", fallback_id="fallback_vid")
    assert result != ""
    assert "fallback" in result


def test_generate_filename_modes():
    # Index title mode
    name1 = generate_filename("Introduction to Python", 1, "abc12345678", naming_mode="index_title")
    assert name1 == "001 - Introduction to Python.mp4"

    # Title only mode
    name2 = generate_filename("Variables and Data Types", 2, "abc12345678", naming_mode="title_only")
    assert name2 == "Variables and Data Types.mp4"

    # Index only mode
    name3 = generate_filename("Control Flow", 3, "abc12345678", naming_mode="index_only")
    assert name3 == "003.mp4"
