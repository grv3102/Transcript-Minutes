import requests
import sys
import json
import tempfile
import os
from datetime import datetime
from pathlib import Path

class MeetingMinutesAPITester:
    def __init__(self, base_url="https://meeting-minutes-ai-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", AI Integration: {data.get('ai_integration', 'unknown')}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, str(e))
            return False

    def test_process_transcript_valid(self):
        """Test processing valid transcript"""
        sample_transcript = """
        John: Good morning everyone. Let's start today's project meeting.
        Mary: Thanks John. I wanted to discuss the timeline for the new feature.
        John: Great point. I think we should set the deadline for next Friday.
        Mary: I agree. I'll handle the frontend development.
        John: Perfect. I'll take care of the backend API integration.
        Mary: We also decided to use React for the frontend framework.
        John: That sounds good. Let's schedule a follow-up meeting for Thursday.
        """
        
        try:
            response = requests.post(
                f"{self.api_url}/process-transcript",
                json={"transcript": sample_transcript},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # Validate response structure
                required_fields = ['id', 'summary', 'action_items', 'decisions', 'participants', 'topics', 'processing_method']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += f", Processing method: {data.get('processing_method')}"
                    details += f", Participants: {len(data.get('participants', []))}"
                    details += f", Action items: {len(data.get('action_items', []))}"
                    
            self.log_test("Process Valid Transcript", success, details)
            return success, response.json() if success else None
            
        except Exception as e:
            self.log_test("Process Valid Transcript", False, str(e))
            return False, None

    def test_process_transcript_empty(self):
        """Test processing empty transcript"""
        try:
            response = requests.post(
                f"{self.api_url}/process-transcript",
                json={"transcript": ""},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # Should return 400 for empty transcript
            success = response.status_code == 400
            details = f"Status: {response.status_code}"
            if not success and response.status_code != 400:
                details += " (Expected 400 for empty transcript)"
                
            self.log_test("Process Empty Transcript", success, details)
            return success
            
        except Exception as e:
            self.log_test("Process Empty Transcript", False, str(e))
            return False

    def test_process_transcript_short(self):
        """Test processing very short transcript"""
        try:
            response = requests.post(
                f"{self.api_url}/process-transcript",
                json={"transcript": "Hi"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # Should return 400 for short transcript
            success = response.status_code == 400
            details = f"Status: {response.status_code}"
            if not success and response.status_code != 400:
                details += " (Expected 400 for short transcript)"
                
            self.log_test("Process Short Transcript", success, details)
            return success
            
        except Exception as e:
            self.log_test("Process Short Transcript", False, str(e))
            return False

    def test_upload_txt_file(self):
        """Test uploading a .txt file"""
        sample_content = """
        Meeting Notes - Project Alpha
        
        Attendees: Alice, Bob, Charlie
        
        Alice: We need to finalize the project scope by Monday.
        Bob: I'll prepare the technical specifications.
        Charlie: I agree with the timeline. I'll handle the documentation.
        Alice: Great! We decided to use Python for the backend.
        Bob: Perfect. Let's meet again on Wednesday to review progress.
        """
        
        try:
            # Create temporary txt file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(sample_content)
                temp_file_path = f.name
            
            try:
                with open(temp_file_path, 'rb') as f:
                    files = {'file': ('test_transcript.txt', f, 'text/plain')}
                    response = requests.post(
                        f"{self.api_url}/upload-transcript",
                        files=files,
                        timeout=30
                    )
                
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    details += f", Processing method: {data.get('processing_method')}"
                    details += f", Participants: {len(data.get('participants', []))}"
                    
                self.log_test("Upload TXT File", success, details)
                return success
                
            finally:
                os.unlink(temp_file_path)
                
        except Exception as e:
            self.log_test("Upload TXT File", False, str(e))
            return False

    def test_upload_invalid_file(self):
        """Test uploading invalid file type"""
        try:
            # Create temporary file with invalid extension
            with tempfile.NamedTemporaryFile(mode='w', suffix='.pdf', delete=False) as f:
                f.write("Invalid file content")
                temp_file_path = f.name
            
            try:
                with open(temp_file_path, 'rb') as f:
                    files = {'file': ('test.pdf', f, 'application/pdf')}
                    response = requests.post(
                        f"{self.api_url}/upload-transcript",
                        files=files,
                        timeout=10
                    )
                
                # Should return 400 for invalid file type
                success = response.status_code == 400
                details = f"Status: {response.status_code}"
                if not success:
                    details += " (Expected 400 for invalid file type)"
                    
                self.log_test("Upload Invalid File Type", success, details)
                return success
                
            finally:
                os.unlink(temp_file_path)
                
        except Exception as e:
            self.log_test("Upload Invalid File Type", False, str(e))
            return False

    def test_export_pdf(self):
        """Test PDF export functionality"""
        # First process a transcript to get minutes data
        success, minutes_data = self.test_process_transcript_valid()
        if not success or not minutes_data:
            self.log_test("Export PDF", False, "Failed to get minutes data for PDF export")
            return False
        
        try:
            response = requests.post(
                f"{self.api_url}/export-pdf/{minutes_data['id']}",
                json=minutes_data,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                # Check if response is PDF
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    details += f", Content-Type: {content_type}, Size: {len(response.content)} bytes"
                else:
                    success = False
                    details += f", Invalid content type: {content_type}"
                    
            self.log_test("Export PDF", success, details)
            return success
            
        except Exception as e:
            self.log_test("Export PDF", False, str(e))
            return False

    def test_ai_processing_accuracy(self):
        """Test AI processing accuracy with structured transcript"""
        structured_transcript = """
        Project Status Meeting - March 15, 2024
        
        Participants: Sarah Johnson (Project Manager), Mike Chen (Developer), Lisa Wang (Designer)
        
        Sarah: Good morning everyone. Let's review our progress on the mobile app project.
        
        Mike: I've completed the user authentication module. The login and registration features are working perfectly.
        
        Lisa: Great! I've finished the UI designs for the main dashboard. I'll send them to you by end of day.
        
        Sarah: Excellent progress. Mike, can you integrate Lisa's designs by Wednesday?
        
        Mike: Absolutely. I'll have the dashboard implementation ready by Wednesday afternoon.
        
        Sarah: Perfect. We've decided to launch the beta version on April 1st.
        
        Lisa: I agree with that timeline. I'll prepare the marketing materials by March 25th.
        
        Sarah: One more thing - we need to conduct user testing next week. Mike, can you set up the testing environment?
        
        Mike: Sure, I'll have the testing environment ready by Monday.
        
        Sarah: Great! Let's schedule our next meeting for Friday to review the beta version.
        """
        
        try:
            response = requests.post(
                f"{self.api_url}/process-transcript",
                json={"transcript": structured_transcript},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                # Check for expected participants
                participants = data.get('participants', [])
                expected_participants = ['Sarah', 'Mike', 'Lisa']
                found_participants = sum(1 for p in expected_participants if any(p in participant for participant in participants))
                
                # Check for action items
                action_items = data.get('action_items', [])
                
                # Check for decisions
                decisions = data.get('decisions', [])
                
                details += f", Participants found: {found_participants}/3"
                details += f", Action items: {len(action_items)}"
                details += f", Decisions: {len(decisions)}"
                details += f", Processing: {data.get('processing_method')}"
                
                # Consider test successful if we found most participants and some structure
                accuracy_score = (found_participants >= 2 and len(action_items) > 0)
                if not accuracy_score:
                    success = False
                    details += " (Low accuracy in extraction)"
                    
            self.log_test("AI Processing Accuracy", success, details)
            return success
            
        except Exception as e:
            self.log_test("AI Processing Accuracy", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Meeting Minutes API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_process_transcript_valid,
            self.test_process_transcript_empty,
            self.test_process_transcript_short,
            self.test_upload_txt_file,
            self.test_upload_invalid_file,
            self.test_export_pdf,
            self.test_ai_processing_accuracy
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ {test.__name__} - CRASHED: {str(e)}")
                self.tests_run += 1
            print()
        
        # Summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate < 70:
            print("⚠️  WARNING: Low success rate detected!")
        elif success_rate >= 90:
            print("🎉 Excellent! Most tests are passing.")
        
        return self.tests_passed, self.tests_run, self.test_results

def main():
    tester = MeetingMinutesAPITester()
    passed, total, results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())