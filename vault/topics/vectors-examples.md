---
topic: vectors-examples
units: [5]
tags: [vectors, linear-algebra, examples]
type: examples
---
# וקטורים — תרגילים עם פתרון

## תרגיל 1: מכפלה סקלרית וזווית
נתון: $\vec{u} = (3, 4)$, $\vec{v} = (1, -2)$. מצא את הזווית ביניהם.

**פתרון:**
$$\vec{u} \cdot \vec{v} = 3 \cdot 1 + 4 \cdot (-2) = 3 - 8 = -5$$
$$|\vec{u}| = \sqrt{9+16} = 5 \qquad |\vec{v}| = \sqrt{1+4} = \sqrt{5}$$
$$\cos\theta = \frac{-5}{5\sqrt{5}} = \frac{-1}{\sqrt{5}} \Rightarrow \theta \approx 116.6°$$

## תרגיל 2: בדיקת ניצבות
האם $\vec{u} = (2, 3, -1)$ ו-$\vec{v} = (1, 0, 2)$ מאונכים?

**פתרון:**
$$\vec{u} \cdot \vec{v} = 2 \cdot 1 + 3 \cdot 0 + (-1) \cdot 2 = 2 + 0 - 2 = 0$$

כן, הוקטורים מאונכים זה לזה.

## תרגיל 3: שטח משולש בעזרת וקטורים
נתונות נקודות $A(1,0)$, $B(4,0)$, $C(2,3)$. מצא את שטח המשולש.

**פתרון:**
$$\overrightarrow{AB} = (3, 0) \qquad \overrightarrow{AC} = (1, 3)$$

"מכפלה וקטורית" במישור: $|3 \cdot 3 - 0 \cdot 1| = 9$

$$S = \frac{1}{2} \cdot 9 = 4.5 \text{ יחידות}^2$$

## תרגיל 4: פירוק וקטור
פרק את $\vec{v} = (5, 3)$ לרכיב המקביל ולרכיב הניצב ל-$\vec{u} = (1, 0)$.

**פתרון:**
$$\text{רכיב מקביל} = \frac{\vec{v} \cdot \vec{u}}{|\vec{u}|^2}\vec{u} = \frac{5}{1}(1,0) = (5,0)$$
$$\text{רכיב ניצב} = \vec{v} - (5,0) = (0,3)$$
