from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

from accounts.models import UserGoal

User = get_user_model()

REGISTER = "/api/auth/register/"
LOGIN = "/api/auth/login/"
LOGOUT = "/api/auth/logout/"
ME = "/api/auth/me/"


class RegistrationTests(APITestCase):
    def setUp(self):
        cache.clear()  # reset auth throttling between tests

    def payload(self, **overrides):
        data = {
            "username": "jamie",
            "email": "Jamie@Example.com",
            "password": "Sunrise-run-42",
            "password_confirm": "Sunrise-run-42",
        }
        data.update(overrides)
        return data

    def test_register_creates_user_goal_and_session(self):
        res = self.client.post(REGISTER, self.payload(), format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["username"], "jamie")
        self.assertEqual(res.data["email"], "jamie@example.com")  # normalised
        self.assertNotIn("password", res.data)
        user = User.objects.get(username="jamie")
        self.assertTrue(user.check_password("Sunrise-run-42"))
        self.assertNotEqual(user.password, "Sunrise-run-42")  # hashed
        self.assertTrue(UserGoal.objects.filter(user=user).exists())
        # The user is signed in straight away.
        self.assertEqual(self.client.get(ME).status_code, 200)

    def test_password_mismatch(self):
        res = self.client.post(REGISTER, self.payload(password_confirm="Different-42"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("password_confirm", res.data)

    def test_weak_password_rejected(self):
        res = self.client.post(REGISTER, self.payload(password="12345678", password_confirm="12345678"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.data)

    def test_duplicate_username_and_email_case_insensitive(self):
        self.client.post(REGISTER, self.payload(), format="json")
        self.client.post(LOGOUT)
        res = self.client.post(REGISTER, self.payload(username="JAMIE", email="other@example.com"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("username", res.data)
        res = self.client.post(REGISTER, self.payload(username="other", email="jamie@EXAMPLE.com"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.data)

    def test_required_fields_and_invalid_email(self):
        res = self.client.post(REGISTER, {"email": "not-an-email"}, format="json")
        self.assertEqual(res.status_code, 400)
        for field in ("username", "email", "password", "password_confirm"):
            self.assertIn(field, res.data)


class LoginTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user("sam", "sam@example.com", "Evening-walk-7")

    def test_login_with_username(self):
        res = self.client.post(LOGIN, {"identifier": "sam", "password": "Evening-walk-7"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["username"], "sam")
        self.assertEqual(self.client.get(ME).status_code, 200)

    def test_login_with_email_case_insensitive(self):
        res = self.client.post(LOGIN, {"identifier": "SAM@example.com", "password": "Evening-walk-7"}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_invalid_credentials(self):
        res = self.client.post(LOGIN, {"identifier": "sam", "password": "wrong"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["detail"], "Incorrect username/email or password.")
        res = self.client.post(LOGIN, {"identifier": "nobody", "password": "wrong"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.client.get(ME).status_code, 401)

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save()
        res = self.client.post(LOGIN, {"identifier": "sam", "password": "Evening-walk-7"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_logout_ends_session(self):
        self.client.post(LOGIN, {"identifier": "sam", "password": "Evening-walk-7"}, format="json")
        self.assertEqual(self.client.post(LOGOUT).status_code, 204)
        self.assertEqual(self.client.get(ME).status_code, 401)

    def test_login_requires_csrf_token(self):
        client = APIClient(enforce_csrf_checks=True)
        res = client.post(LOGIN, {"identifier": "sam", "password": "Evening-walk-7"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertIn("CSRF", str(res.data["detail"]))

        client.get("/api/auth/csrf/")
        token = client.cookies["csrftoken"].value
        res = client.post(
            LOGIN, {"identifier": "sam", "password": "Evening-walk-7"}, format="json", HTTP_X_CSRFTOKEN=token
        )
        self.assertEqual(res.status_code, 200)

    def test_session_cookie_is_httponly(self):
        res = self.client.post(LOGIN, {"identifier": "sam", "password": "Evening-walk-7"}, format="json")
        self.assertTrue(res.cookies["sessionid"]["httponly"])


class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("lee", "lee@example.com", "Morning-yoga-9")
        User.objects.create_user("taken", "taken@example.com", "Morning-yoga-9")
        self.client.force_authenticate(self.user)

    def test_me_returns_profile(self):
        res = self.client.get(ME)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(res.data), {"id", "username", "email", "display_name", "date_joined", "weekly_workout_target"})

    def test_update_profile(self):
        res = self.client.patch(ME, {"display_name": "  Lee  ", "username": "lee_fit"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Lee")
        self.assertEqual(self.user.username, "lee_fit")

    def test_update_rejects_taken_username_and_email(self):
        res = self.client.patch(ME, {"username": "Taken", "email": "TAKEN@example.com"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("username", res.data)
        self.assertIn("email", res.data)

    def test_goal_get_and_update(self):
        res = self.client.get("/api/goals/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["weekly_workout_target"], 3)
        res = self.client.patch("/api/goals/", {"weekly_workout_target": 4}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.get(ME).data["weekly_workout_target"], 4)

    def test_goal_out_of_range(self):
        for value in (0, 15, -1):
            res = self.client.patch("/api/goals/", {"weekly_workout_target": value}, format="json")
            self.assertEqual(res.status_code, 400, value)


class UnauthenticatedAccessTests(APITestCase):
    def test_private_endpoints_return_401(self):
        for url in (
            ME,
            "/api/goals/",
            "/api/exercises/",
            "/api/workouts/",
            "/api/workouts/1/",
            "/api/dashboard/summary/",
            "/api/progress/weekly/",
            "/api/progress/trends/",
        ):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 401)
        self.assertEqual(self.client.post("/api/workouts/", {}, format="json").status_code, 401)
