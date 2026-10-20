---
topic: integrals-examples
units: [4, 5]
tags: [calculus, integration, examples]
type: examples
---
# אינטגרלים — תרגילים עם פתרון

## תרגיל 1: אינטגרל לא מסוים בסיסי
חשב: $\int (3x^2 - 4x + 5)\,dx$

**פתרון:**
$$\int (3x^2 - 4x + 5)\,dx = x^3 - 2x^2 + 5x + C$$

## תרגיל 2: אינטגרציה בהצבה
חשב: $\int 2x(x^2+1)^4\,dx$

**פתרון:**
הצבה: $u = x^2 + 1 \Rightarrow du = 2x\,dx$

$$\int u^4\,du = \frac{u^5}{5} + C = \frac{(x^2+1)^5}{5} + C$$

## תרגיל 3: אינטגרל מסוים
חשב: $\int_1^3 (2x + 1)\,dx$

**פתרון:**
$$F(x) = x^2 + x$$
$$\int_1^3 (2x+1)\,dx = F(3) - F(1) = (9+3) - (1+1) = 12 - 2 = 10$$

## תרגיל 4: שטח בין שתי פונקציות
מצא את השטח בין $f(x) = x^2$ ו-$g(x) = x$ בתחום שביניהן.

**פתרון:**
נקודות חיתוך: $x^2 = x \Rightarrow x(x-1) = 0 \Rightarrow x = 0,\ x = 1$

בתחום $[0,1]$: $g(x) \geq f(x)$

$$S = \int_0^1 (x - x^2)\,dx = \left[\frac{x^2}{2} - \frac{x^3}{3}\right]_0^1 = \frac{1}{2} - \frac{1}{3} = \frac{1}{6}$$
