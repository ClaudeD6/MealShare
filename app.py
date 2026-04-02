from flask import Flask, render_template, jsonify

app = Flask(__name__)

meals = [
    {
        "id": 1,
        "title": "Italian Dinner",
        "host": "Sergio",
        "food_type": "Pasta",
        "location": "Hoboken",
        "time": "6:00 PM",
        "price": 8,
        "spots_left": 3,
        "description": "Homemade penne, garlic bread, and salad.",
        "requested": False
    },
    {
        "id": 2,
        "title": "Taco Night",
        "host": "Claude",
        "food_type": "Mexican",
        "location": "Stevens Campus",
        "time": "7:00 PM",
        "price": 5,
        "spots_left": 2,
        "description": "Chicken and beef tacos with chips and salsa.",
        "requested": False
    },
    {
        "id": 3,
        "title": "Homemade Burgers",
        "host": "Alex",
        "food_type": "American",
        "location": "Jersey City",
        "time": "5:30 PM",
        "price": 10,
        "spots_left": 4,
        "description": "Burgers, fries, and drinks for a casual dinner.",
        "requested": False
    },
    {
        "id": 4,
        "title": "Sushi Study Break",
        "host": "Maya",
        "food_type": "Japanese",
        "location": "Hoboken",
        "time": "8:00 PM",
        "price": 12,
        "spots_left": 1,
        "description": "Sushi rolls and snacks during a late study session.",
        "requested": False
    }
]

def find_meal(meal_id):
    for meal in meals:
        if meal["id"] == meal_id:
            return meal
    return None

@app.route("/")
def home():
    return render_template("guest.html")

@app.route("/meals")
def get_meals():
    return jsonify(meals)

@app.route("/request/<int:meal_id>", methods=["POST"])
def request_meal(meal_id):
    meal = find_meal(meal_id)
    if not meal:
        return jsonify({"success": False, "message": "Meal not found."}), 404

    meal["requested"] = True
    return jsonify({
        "success": True,
        "message": f"Request sent for {meal['title']}!"
    })

@app.route("/cancel/<int:meal_id>", methods=["POST"])
def cancel_request(meal_id):
    meal = find_meal(meal_id)
    if not meal:
        return jsonify({"success": False, "message": "Meal not found."}), 404

    meal["requested"] = False
    return jsonify({
        "success": True,
        "message": f"Request canceled for {meal['title']}."
    })

if __name__ == "__main__":
    app.run(debug=True)
