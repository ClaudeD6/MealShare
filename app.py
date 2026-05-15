from flask import Flask, render_template, jsonify, request, session, redirect, url_for
import csv
from datetime import datetime

app = Flask(__name__)
app.secret_key = "mealshare-secret-key-2024"

# ── Load users ──────────────────────────────────────────────────────────────
def load_users(filepath):
    users = {}
    with open(filepath, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            users[row["Username"]] = {
                "password": row["Password"],
                "address": row["Address"],
                "role": row["Role"]
            }
    return users

users = load_users('/Users/claude/MealShare/app_data - sample_users.csv')

# ── Load meals ───────────────────────────────────────────────────────────────
def load_meals(filepath):
    meals = []
    with open(filepath, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row["title"].strip():
                continue
            time_raw = row["time"].strip()
            try:
                time_fmt = datetime.strptime(time_raw, "%Y-%m-%d %H:%M").strftime("%-I:%M %p")
            except Exception:
                time_fmt = time_raw
            meals.append({
                "id": int(float(row["id"])),
                "title": row["title"],
                "host": row["host"],
                "food_type": row["food_type"],
                "location": row["location"],
                "time": time_fmt,
                "price": float(row["price"]),
                "spots_left": int(float(row["spots"])),
                "description": row["description"],
                "requested": False,
                "requesters": []   # list of usernames who requested
            })
    return meals

meals = load_meals('/Users/claude/MealShare/app_data - meals.csv')

def find_meal(meal_id):
    for meal in meals:
        if meal["id"] == meal_id:
            return meal
    return None

# ── Auth routes ───────────────────────────────────────────────────────────────
@app.route("/")
def home():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("guest.html")

@app.route("/login", methods=["GET"])
def login():
    return render_template("login.html")

@app.route("/login", methods=["POST"])
def do_login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    user = users.get(username)
    if user and user["password"] == password:
        session["username"] = username
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Invalid username or password."})

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})

@app.route("/me")
def me():
    if "username" not in session:
        return jsonify({"authenticated": False}), 401
    return jsonify({"authenticated": True, "username": session["username"]})

# ── Meal routes ───────────────────────────────────────────────────────────────
@app.route("/meals")
def get_meals():
    if "username" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(meals)

@app.route("/meals/create", methods=["POST"])
def create_meal():
    if "username" not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401
    data = request.get_json()
    new_id = max(m["id"] for m in meals) + 1 if meals else 1
    new_meal = {
        "id": new_id,
        "title": data.get("title", "Untitled"),
        "host": session["username"],
        "food_type": data.get("food_type", ""),
        "location": data.get("location", ""),
        "time": data.get("time", ""),
        "price": float(data.get("price", 0)),
        "spots_left": int(data.get("spots_left", 1)),
        "description": data.get("description", ""),
        "requested": False,
        "requesters": []
    }
    meals.append(new_meal)
    return jsonify({"success": True, "meal": new_meal})

@app.route("/request/<int:meal_id>", methods=["POST"])
def request_meal(meal_id):
    if "username" not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401
    meal = find_meal(meal_id)
    if not meal:
        return jsonify({"success": False, "message": "Meal not found."}), 404
    username = session["username"]
    if username == meal["host"]:
        return jsonify({"success": False, "message": "You can't request your own meal."}), 400
    if username not in meal["requesters"]:
        meal["requesters"].append(username)
    meal["requested"] = True
    return jsonify({"success": True, "message": f"Request sent for {meal['title']}!"})

@app.route("/cancel/<int:meal_id>", methods=["POST"])
def cancel_request(meal_id):
    if "username" not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401
    meal = find_meal(meal_id)
    if not meal:
        return jsonify({"success": False, "message": "Meal not found."}), 404
    username = session["username"]
    if username in meal["requesters"]:
        meal["requesters"].remove(username)
    meal["requested"] = False
    return jsonify({"success": True, "message": f"Request canceled for {meal['title']}."})

@app.route("/manage/<int:meal_id>/accept/<requester>", methods=["POST"])
def accept_requester(meal_id, requester):
    if "username" not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401
    meal = find_meal(meal_id)
    if not meal or meal["host"] != session["username"]:
        return jsonify({"success": False, "message": "Unauthorized."}), 403
    if requester in meal["requesters"]:
        meal["requesters"].remove(requester)
        meal["spots_left"] = max(0, meal["spots_left"] - 1)
    return jsonify({"success": True, "spots_left": meal["spots_left"]})

@app.route("/manage/<int:meal_id>/decline/<requester>", methods=["POST"])
def decline_requester(meal_id, requester):
    if "username" not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401
    meal = find_meal(meal_id)
    if not meal or meal["host"] != session["username"]:
        return jsonify({"success": False, "message": "Unauthorized."}), 403
    if requester in meal["requesters"]:
        meal["requesters"].remove(requester)
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)