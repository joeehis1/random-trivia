# Trivia

Documentation still pending.

# Problems Faced

The text that comes back from the API is littered with HTML entities. Creating the regEx to remove date entitities is an ongoing process. Since I may

Setting up the timer is always tricky. The code went through several iterations over the course of a day. Eventually i realised that it would not be suitable to isolate the duration within the timer component as originally planned. So by lifting state up to the app component the problem was mostly solved.

The next issue was finding the appropriate point to play the audio. I had initially forgotten that i was making a call to set the value of the isCorrect variable twice. Placing the call to the audio within the quiz component would have been a little complicated to handle. So i decided to create two audio elements and create separate refs that would play depending on the value of isCorrect.

The final issue that was really tricky to manage was resetting the duration everytime an answer was wrong.
