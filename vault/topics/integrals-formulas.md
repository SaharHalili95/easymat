---
topic: integrals-formulas
units: [4, 5]
tags: [calculus, integration, formulas]
type: formulas
---
# אינטגרלים — נוסחאות

## אינטגרל לא מסוים
$$\int f(x)\,dx = F(x) + C \quad \text{כאשר } F'(x) = f(x)$$

## טבלת אינטגרלים בסיסיים
| $f(x)$ | $\int f(x)\,dx$ |
|--------|----------------|
| $x^n\ (n \neq -1)$ | $\frac{x^{n+1}}{n+1} + C$ |
| $\frac{1}{x}$ | $\ln|x| + C$ |
| $e^x$ | $e^x + C$ |
| $a^x$ | $\frac{a^x}{\ln a} + C$ |
| $\sin x$ | $-\cos x + C$ |
| $\cos x$ | $\sin x + C$ |
| $\frac{1}{\cos^2 x}$ | $\tan x + C$ |

## כללי אינטגרל
$$\int [f(x) \pm g(x)]\,dx = \int f(x)\,dx \pm \int g(x)\,dx$$
$$\int c \cdot f(x)\,dx = c \int f(x)\,dx$$

## אינטגרציה בהצבה
$$\int f(g(x)) \cdot g'(x)\,dx = F(g(x)) + C$$

## אינטגרל מסוים
$$\int_a^b f(x)\,dx = F(b) - F(a)$$

## שטח מתחת לגרף
$$S = \int_a^b |f(x)|\,dx$$

כשהפונקציה חיובית: $S = \int_a^b f(x)\,dx$

**שטח בין שתי פונקציות:**
$$S = \int_a^b [f(x) - g(x)]\,dx \quad \text{כאשר } f(x) \geq g(x)$$
