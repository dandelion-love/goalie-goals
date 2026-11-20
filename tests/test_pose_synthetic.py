import copy
import json
import subprocess
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import pose_synthetic as pose  # noqa: E402


class SyntheticPoseTest(unittest.TestCase):
    def setUp(self):
        self.fixture = json.loads(pose.FIXTURES['synthetic-squat-v1'].read_text(encoding='utf-8'))
        self.manifest = json.loads(pose.MANIFEST.read_text(encoding='utf-8'))

    def test_fixture_renders_two_stills_and_timed_poses_without_external_assets(self):
        result = pose.render(self.fixture, self.manifest)
        root = ET.fromstring(result)
        self.assertEqual(root.attrib['viewBox'], '0 0 360 200')
        self.assertIn('75.000%', result)
        self.assertIn('prefers-reduced-motion', result)
        self.assertEqual(result.count('<circle '), 4)
        self.assertNotIn('href=', result)
        self.assertNotIn('<image', result)
        self.assertNotIn('<script', result)
        self.assertNotIn('nasa-ared', result)

    def test_timing_and_angles_change_the_render(self):
        changed = copy.deepcopy(self.fixture)
        changed['poses'][0]['duration_ms'] = 1000
        changed['poses'][0]['angles']['upper_arm'] = 30
        baseline = pose.render(self.fixture, self.manifest)
        result = pose.render(changed, self.manifest)
        self.assertIn('50.000%', result)
        self.assertNotEqual(result, baseline)
        self.assertEqual(result, pose.render(changed, self.manifest))

    def test_rejects_reference_unlisted_url_and_path(self):
        for source in ('nasa-ared', 'unknown', 'https://example.test/video', '../private.mp4'):
            data = copy.deepcopy(self.fixture)
            data['source_id'] = source
            with self.subTest(source=source), self.assertRaises(ValueError):
                pose.render(data, self.manifest)
            run = subprocess.run([sys.executable, str(ROOT / 'tools' / 'pose_synthetic.py'), source], capture_output=True, text=True)
            self.assertNotEqual(run.returncode, 0)
            self.assertNotIn('<svg', run.stdout)

    def test_rejects_disabled_or_duplicate_manifest_entry(self):
        for mutation in ('disabled', 'duplicate'):
            manifest = copy.deepcopy(self.manifest)
            if mutation == 'disabled':
                manifest['sources'][0]['enabled'] = False
            else:
                manifest['sources'].append(copy.deepcopy(manifest['sources'][0]))
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                pose.render(self.fixture, manifest)

    def test_rejects_malformed_out_of_range_and_extra_fields(self):
        cases = []
        for angle in (float('nan'), float('inf'), 181, True, '90'):
            data = copy.deepcopy(self.fixture)
            data['poses'][0]['angles']['shin'] = angle
            cases.append(data)
        for field, value in (('duration_ms', 0), ('root', [339, 180]), ('extra', 'untrusted')):
            data = copy.deepcopy(self.fixture)
            data['poses'][0][field] = value
            cases.append(data)
        for data in cases:
            with self.subTest(data=data), self.assertRaises(ValueError):
                pose.render(data, self.manifest)

    def test_cli_accepts_only_the_fixed_fixture_identifier(self):
        run = subprocess.run([sys.executable, str(ROOT / 'tools' / 'pose_synthetic.py'), 'synthetic-squat-v1'], capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(ET.fromstring(run.stdout).attrib['id'], 'motion')


if __name__ == '__main__':
    unittest.main()
