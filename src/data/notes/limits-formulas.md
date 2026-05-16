---
topic: limits-formulas
units: [5]
tags: [calculus, limits, formulas]
type: formulas
---
# גבולות — נוסחאות

## הגדרה אינטואיטיבית
$$\lim_{x \to a} f(x) = L$$
הפונקציה מתקרבת לערך $L$ כאשר $x$ מתקרב ל-$a$.

## גבולות יסודיים
$$\lim_{x \to 0} \frac{\sin x}{x} = 1$$
$$\lim_{x \to \infty} \left(1 + \frac{1}{x}\right)^x = e$$
$$\lim_{x \to 0} \frac{e^x - 1}{x} = 1$$
$$\lim_{x \to 0} \frac{\ln(1+x)}{x} = 1$$

## כללי גבולות
$$\lim[f(x) \pm g(x)] = \lim f(x) \pm \lim g(x)$$
$$\lim[f(x) \cdot g(x)] = \lim f(x) \cdot \lim g(x)$$
$$\lim\frac{f(x)}{g(x)} = \frac{\lim f(x)}{\lim g(x)} \quad (\lim g(x) \neq 0)$$

## צורות אי-קביעות וכלל לופיטל
כאשר מתקבלת הצורה $\frac{0}{0}$ או $\frac{\infty}{\infty}$:
$$\lim_{x \to a} \frac{f(x)}{g(x)} = \lim_{x \to a} \frac{f'(x)}{g'(x)}$$

## גבולות באינסוף
$$\lim_{x \to \infty} \frac{1}{x} = 0 \qquad \lim_{x \to \infty} x^n = \infty$$

**לפולינומים:** רמת הגבול נקבעת לפי המעלה הגבוהה ביותר.

$$\lim_{x \to \infty} \frac{3x^2 + 5x}{x^2 - 1} = \lim_{x \to \infty} \frac{3 + \frac{5}{x}}{1 - \frac{1}{x^2}} = 3$$

## רציפות
$f$ רציפה ב-$x = a$ אם: $\lim_{x \to a} f(x) = f(a)$
