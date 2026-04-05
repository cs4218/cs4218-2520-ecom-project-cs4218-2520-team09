# Secrity Testing for login page

## Test 1 - Attempt Login

### Test 1.1 - Error Messages
Two scenarios can occur here:

1. Invalid Email
2. Valid Email but Invalid Password

Testing will be done for both possible scenarios. <br>

In the event of Invalid Email, we get the error message: <br> <strong>Something went wrong </strong> <br>

However, with a Valid Email but Invalid Password, we get the error message: <br>
<strong> Invalid Password </strong> <br>

This is a security violation as attackers can effectively brute force and guess valid email addresses by checking the error message. 

### Fix
Ensure a common error message for both cases.

### Test 1.2 - Lack of login attempt rate limiting
There is no limit on how many times a user can attempt to login. This makes the application vulnerable to brute force attacks, which effective allows the attacker to endlessly guess login details, and even possibly cause a DoS on the application

### Fix
Add /middlewares/rateLimiter.js and modified /routes/authRoute.js to use the rate limiter. <br>
This prevents attackers from brute forcing.

## Test 2 - Lack of https
Due to the lack of https, data sent through the application can be seen in plain form <br>
![Wireshark Capture](login_wireshark.png)

As in the image of a Wireshark packet capture, the email and password can be seen easily by anyone who managed to sniff the packet.

### Fix
Enable https to allow for encryption of data sent. (Not applied)

## Test 3 - Potential NoSQL Injection Vulnerability
This vulnerability was discovered through a scan from an online tool [Aikido](https://www.aikido.dev/).
![Aikido scan results](login_aikido.png)
![Vulnerable login controller](login_aikido_2.png)

From the scan, we can see that authController.js, specifically the loginController function is possibly vulnerable to a NoSQL injection.

### Fix
Following the suggestion by Aikido, the fix is applied to treat the user input as a literal value, instead of previously reading user input as a query object which could bypass authentication.
