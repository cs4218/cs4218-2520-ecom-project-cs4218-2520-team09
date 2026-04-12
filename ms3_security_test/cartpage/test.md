# Security Testing for CartPage

## Test 1 - Client sided cart
This vulnerability was discovered through a scan from an online tool [Semgrep](https://semgrep.dev/).
![Semgrep scan](cartpage_cart.png)

Since the current logic for CartPage payment system relies on sending the entire cart (including the item's prices) to the backend without verification, the prices of items can be easily modified on the user's localStorage.

Before
![Before](cartpage_before.png)

After
![After](cartpage_after.png)

As shown in the screenshots, the prices can be easily modified by directly editting the value in the localStorage.

### Fix
Instead of trusting the prices on the client side, modify the backend to fetch the product price directly from the database so that any client side modifications would not be reflected in the backend.

## Test 2 - Logic Flaw
Each product comes with a quantity, denoting how many products are available to purchase. However, this was not checked at all. As a result, it was possible to purchase more products than what was available.

### Fix
Implemented checking and updating of quantity for products when user attempts to checkout.

## Test 3 - Sniffing data with Wireshark
Attempt to sniff for any sensitive data over Wireshark. <br>
While the application runs over http, payment side is done by Braintree, which is handled in https. As such, while we can see the purchase request being sent over the network, we are unable to view any payment information. Thus, the payment method is deemed as not vulnerable to sniffing attack.

## Test 4 - Modifying data sent with Burp Suite
Using Burp Suite to intercept requests and forwarding it to the backend. <br>
While we can manually change the values to be sent to the backend, the backend has been fixed by test 1 to verify the data from backend, as such this is not vulnerable to packet manipulation.

## Test 5 - Local storage persisting across sessions
On logging in and out, it is observed that the cart information is preserved across sessions. This can be unwanted behaviour as a user could view other user's cart if they did not clear it locally. <br>

### Fix
On logout, forcibly clear the cart. 