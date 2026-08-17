import os
import sys
import unittest
from pathlib import Path
import cli

class TestDownloadKanCLI(unittest.TestCase):
    def test_sanitize_filename(self):
        dirty = 'Test: File / with \\ bad * characters ? < > |'
        clean = cli.sanitize_filename(dirty)
        for char in r'\/*?:"<>|':
            self.assertNotIn(char, clean)
        self.assertEqual(clean, "Test File with bad characters")

    def test_format_bytes(self):
        self.assertEqual(cli.format_bytes(500), "500.0 B")
        self.assertEqual(cli.format_bytes(1024 * 1024), "1.0 MB")
        self.assertEqual(cli.format_bytes(1024 * 1024 * 1024 * 2), "2.0 GB")
        self.assertEqual(cli.format_bytes(None), "N/A")

    def test_format_duration(self):
        self.assertEqual(cli.format_duration(65), "01:05")
        self.assertEqual(cli.format_duration(3665), "1:01:05")
        self.assertEqual(cli.format_duration(None), "--:--")

    def test_config_loader(self):
        cfg = cli.load_config()
        self.assertIn("download_dir", cfg)
        self.assertIn("preferred_video_quality", cfg)
        self.assertIn("preferred_audio_format", cfg)
        self.assertIn("aria2_connections", cfg)

    def test_get_download_dirs(self):
        dirs = cli.get_download_dirs()
        self.assertTrue(dirs["base"].exists())
        self.assertTrue(dirs["videos"].exists())
        self.assertTrue(dirs["music"].exists())
        self.assertTrue(dirs["torrents"].exists())
        self.assertTrue(dirs["batch"].exists())

    def test_doctor_execution(self):
        # Verify doctor runs without raising exceptions
        try:
            cli.run_doctor()
            doctor_ok = True
        except Exception as e:
            doctor_ok = False
            print(f"Doctor error: {e}")
        self.assertTrue(doctor_ok)

if __name__ == "__main__":
    unittest.main()
