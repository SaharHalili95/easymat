---
topic: vectors-formulas
units: [5]
tags: [vectors, linear-algebra, formulas]
type: formulas
---
# וקטורים — נוסחאות

## ייצוג וקטור
$$\vec{v} = (v_1, v_2) \quad \text{(מישור)} \qquad \vec{v} = (v_1, v_2, v_3) \quad \text{(מרחב)}$$

## פעולות בסיסיות
$$\vec{u} + \vec{v} = (u_1 + v_1,\ u_2 + v_2)$$
$$\lambda\vec{v} = (\lambda v_1,\ \lambda v_2)$$

## גודל (אורך) וקטור
$$|\vec{v}| = \sqrt{v_1^2 + v_2^2} \qquad |\vec{v}| = \sqrt{v_1^2 + v_2^2 + v_3^2}$$

## מכפלה סקלרית (Dot Product)
$$\vec{u} \cdot \vec{v} = u_1 v_1 + u_2 v_2 = |\vec{u}||\vec{v}|\cos\theta$$

**קשר ניצבות:** $\vec{u} \perp \vec{v} \Leftrightarrow \vec{u} \cdot \vec{v} = 0$

**זווית בין וקטורים:**
$$\cos\theta = \frac{\vec{u} \cdot \vec{v}}{|\vec{u}||\vec{v}|}$$

## מכפלה וקטורית (Cross Product — מרחב בלבד)
$$\vec{u} \times \vec{v} = \begin{vmatrix} \vec{i} & \vec{j} & \vec{k} \\ u_1 & u_2 & u_3 \\ v_1 & v_2 & v_3 \end{vmatrix}$$

$$|\vec{u} \times \vec{v}| = |\vec{u}||\vec{v}|\sin\theta$$

**שטח מקבילית:** $S = |\vec{u} \times \vec{v}|$, **שטח משולש:** $S = \frac{1}{2}|\vec{u} \times \vec{v}|$

## משוואת ישר במרחב
$$\frac{x - x_0}{l} = \frac{y - y_0}{m} = \frac{z - z_0}{n}$$
כאשר $(l, m, n)$ הוא וקטור כיוון.

## וקטור בין שתי נקודות
$$\overrightarrow{AB} = B - A = (b_1 - a_1,\ b_2 - a_2)$$
