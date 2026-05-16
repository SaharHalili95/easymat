---
topic: limits-examples
units: [5]
tags: [calculus, limits, examples]
type: examples
---
# גבולות — תרגילים עם פתרון

## תרגיל 1: גבול ישיר
חשב: $\lim_{x \to 3} (x^2 - 2x + 1)$

**פתרון:**
הצבה ישירה (הפונקציה רציפה):
$$\lim_{x \to 3} (x^2 - 2x + 1) = 9 - 6 + 1 = 4$$

## תרגיל 2: צורת $\frac{0}{0}$ — פירוק
חשב: $\lim_{x \to 2} \frac{x^2 - 4}{x - 2}$

**פתרון:**
$$\frac{x^2 - 4}{x - 2} = \frac{(x-2)(x+2)}{x-2} = x + 2$$

$$\lim_{x \to 2}(x+2) = 4$$

## תרגיל 3: כלל לופיטל
חשב: $\lim_{x \to 0} \frac{\sin x}{x}$

**פתרון:**
צורה $\frac{0}{0}$, מפעילים לופיטל:
$$\lim_{x \to 0} \frac{(\sin x)'}{(x)'} = \lim_{x \to 0} \frac{\cos x}{1} = \cos 0 = 1$$

## תרגיל 4: גבול באינסוף
חשב: $\lim_{x \to \infty} \frac{2x^3 - x}{x^3 + 5}$

**פתרון:**
מחלקים הכל ב-$x^3$:
$$\lim_{x \to \infty} \frac{2 - \frac{1}{x^2}}{1 + \frac{5}{x^3}} = \frac{2 - 0}{1 + 0} = 2$$
