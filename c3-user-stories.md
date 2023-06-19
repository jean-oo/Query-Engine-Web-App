Please edit this template and commit to the master branch for your user stories submission.   
Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-21w2-intro-to-se/project/checkpoint-3).

## User Story 1
As a student, I want to be able to find the past records of a course for a certain year so that see the average and instruction of that course in different section at that year.



#### Definitions of Done(s)
Scenario 1: Correct searching: The users enter the detailed information (Year, Subject, Course number) about a section of the course they want to query and wish to find the average, highest or lowest grade of that section.\
Given: The user is on the main page.\
When: The user enters a valid Year, Subject, Course number and clicks “Submit”.\
Then: The application presents the page which shows the average grades and instructors of the course of that year.

Scenario 2: Incorrect searching: The users enter the detailed information (Year, Subject, Course number and Section) about a section of the course they want to query and wish to find the average, highest or lowest grade of that section.\
Given: The user is on the main page.\
When: The user enters a invalid Year, Subject and Course number composition and click “Submit”.\
Then: The application shows an error in red telling the user to try again.


## User Story 2
As a student, I want to be able to find the past record for a certain course so that see the past year average of that course.



#### Definitions of Done(s)
Scenario 1: Correct searching: The users enter the detailed information (Subject and Course number) about a section of the course they want to query and wish to find the average of that course in the past all years.\
Given: The user is on the main page.\
When: The user enters a Subject and Course number and clicks “Submit”.\
Then: The application presents the page which shows the average grade of that course for the past all years.


Scenario 2: Incorrect searching: The users enter the detailed information (Subject and Course number) about a section of the course they want to query and wish to find the average of that course in the past all years.\
Given: The user is on the main page.\
When: The user enters an invalid Subject and Course number pair and clicks “Submit”.\
Then: The application shows an error in red telling the user to try again.


## Others
You may provide any additional user stories + DoDs in this section for general TA feedback.  
Note: These will not be graded.
