---
topic: trigonometry
units: [4, 5]
tags: [bagrut, exam-questions, solutions, trigonometry]
type: bagrut
---

## שאלה 1 (בגרות 2024, 5 יחידות)

**שאלה:** פתור את המשוואה הטריגונומטרית בתחום $[0°, 360°]$:
$$2\sin^2 x - \sin x - 1 = 0$$

**פתרון:**

נציב $t = \sin x$: $2t^2 - t - 1 = 0$
$(2t + 1)(t - 1) = 0 \Rightarrow t = -\dfrac{1}{2}$ או $t = 1$

עבור $\sin x = 1$: $x = 90°$

עבור $\sin x = -\dfrac{1}{2}$: $x = 210°$ או $x = 330°$

**תשובה:** $x \in \{90°, 210°, 330°\}$

## שאלה 2 (בגרות 2023, 4 יחידות)

**שאלה:** בשלושת ABC: $AB = 8$, $BC = 6$, $\angle B = 60°$.

סעיף א: חשב את $AC$.

סעיף ב: חשב את שטח המשולש.

**פתרון:**

סעיף א: לפי משפט הקוסינוסים:
$$AC^2 = AB^2 + BC^2 - 2 \cdot AB \cdot BC \cdot \cos B$$
$$= 64 + 36 - 2 \cdot 8 \cdot 6 \cdot \cos 60° = 100 - 96 \cdot \frac{1}{2} = 100 - 48 = 52$$
$$AC = \sqrt{52} = 2\sqrt{13}$$

סעיף ב:
$$S = \frac{1}{2} \cdot AB \cdot BC \cdot \sin B = \frac{1}{2} \cdot 8 \cdot 6 \cdot \sin 60° = 24 \cdot \frac{\sqrt{3}}{2} = 12\sqrt{3}$$

## שאלה 3 (בגרות 2022, 5 יחידות)

**שאלה:** הוכח את הזהות הטריגונומטרית:
$$\frac{\sin x}{1 - \cos x} - \frac{\sin x}{1 + \cos x} = \frac{2}{\sin x}$$

**פתרון:**

$$\text{צד שמאל} = \frac{\sin x(1+\cos x) - \sin x(1-\cos x)}{(1-\cos x)(1+\cos x)}$$

$$= \frac{\sin x + \sin x \cos x - \sin x + \sin x \cos x}{1 - \cos^2 x}$$

$$= \frac{2\sin x \cos x}{\sin^2 x} = \frac{2\cos x}{\sin x}$$

שגיאה בשאלה – התשובה הנכונה היא $\dfrac{2\cos x}{\sin x}$, לא $\dfrac{2}{\sin x}$.

## שאלה 4 (בגרות 2021, 4 יחידות)

**שאלה:** פתור בתחום $[0, 2\pi]$:
$$\cos 2x = \cos x$$

**פתרון:**

$\cos 2x = 2\cos^2 x - 1$

$2\cos^2 x - 1 = \cos x \Rightarrow 2\cos^2 x - \cos x - 1 = 0$

$(2\cos x + 1)(\cos x - 1) = 0$

$\cos x = 1 \Rightarrow x = 0$ או $x = 2\pi$

$\cos x = -\dfrac{1}{2} \Rightarrow x = \dfrac{2\pi}{3}$ או $x = \dfrac{4\pi}{3}$

**תשובה:** $x \in \left\{0, \dfrac{2\pi}{3}, \dfrac{4\pi}{3}, 2\pi\right\}$

## שאלה 5 (בגרות 2020, 5 יחידות)

**שאלה:** נתון $\sin \alpha = \dfrac{3}{5}$ כאשר $\alpha$ זווית חדה.

סעיף א: מצא את $\cos \alpha$ ו-$\tan \alpha$.

סעיף ב: חשב את $\sin 2\alpha$.

סעיף ג: חשב את $\cos 2\alpha$.

**פתרון:**

סעיף א: $\cos \alpha = \sqrt{1 - \sin^2 \alpha} = \sqrt{1 - \frac{9}{25}} = \sqrt{\frac{16}{25}} = \frac{4}{5}$

$\tan \alpha = \dfrac{\sin \alpha}{\cos \alpha} = \dfrac{3/5}{4/5} = \dfrac{3}{4}$

סעיף ב: $\sin 2\alpha = 2\sin\alpha\cos\alpha = 2 \cdot \dfrac{3}{5} \cdot \dfrac{4}{5} = \dfrac{24}{25}$

סעיף ג: $\cos 2\alpha = \cos^2\alpha - \sin^2\alpha = \dfrac{16}{25} - \dfrac{9}{25} = \dfrac{7}{25}$

## שאלה 6 (בגרות 2024, 4 יחידות)

**שאלה:** בשלושת ABC: $\angle A = 45°$, $a = 5\sqrt{2}$, $b = 5$.
מצא את $\angle B$ ואת $\angle C$.

**פתרון:**

לפי משפט הסינוסים:
$$\frac{a}{\sin A} = \frac{b}{\sin B}$$
$$\frac{5\sqrt{2}}{\sin 45°} = \frac{5}{\sin B}$$
$$\frac{5\sqrt{2}}{\frac{\sqrt{2}}{2}} = 10 = \frac{5}{\sin B}$$
$$\sin B = \frac{5}{10} = \frac{1}{2} \Rightarrow B = 30°$$

$\angle C = 180° - 45° - 30° = 105°$

## שאלה 7 (בגרות 2022, 5 יחידות)

**שאלה:** פתור: $\sin x + \cos x = 1$ בתחום $[0°, 360°]$.

**פתרון:**

נעלה בריבוע: $(\sin x + \cos x)^2 = 1$
$\sin^2 x + 2\sin x\cos x + \cos^2 x = 1$
$1 + 2\sin x\cos x = 1$
$\sin 2x = 0 \Rightarrow 2x = 0°, 180°, 360°, 540°$
$x = 0°, 90°, 180°, 270°$

בדיקה (נדרשת כי העלינו בריבוע):
- $x = 0°$: $0 + 1 = 1$ ✓
- $x = 90°$: $1 + 0 = 1$ ✓
- $x = 180°$: $0 + (-1) = -1$ ✗
- $x = 270°$: $-1 + 0 = -1$ ✗

**תשובה:** $x \in \{0°, 90°\}$
