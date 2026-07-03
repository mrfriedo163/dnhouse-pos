# DN House Invoice Templates

Put official DN House printable bill / receipt templates here.

Current MVP:

- `/demo` generates a printable bill directly from the order data.
- The generated bill is a receipt / service slip, not an official e-invoice.

Future workflow:

1. Put the shop bill template file in this folder.
2. Map placeholders from order data into the template.
3. The POS `In` button should open the filled bill and call browser print.

Suggested placeholders:

- `{{order_no}}`
- `{{created_at}}`
- `{{customer_name}}`
- `{{customer_phone}}`
- `{{service_name}}`
- `{{quantity}}`
- `{{unit_price}}`
- `{{subtotal}}`
- `{{discount}}`
- `{{total}}`
- `{{note}}`

