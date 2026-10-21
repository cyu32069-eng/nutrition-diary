# 食物数据来源

当前新增记录范围：fitness-index.json 中的 69 项常用中文食物。肉类均选 raw 条目，
不按烹饪做法拆分；绿色蔬菜 17 项、食用油 10 项。搜索和分类只在这个常用库内进行。
既有 7,793 条基础数据和旧中文索引用于核对来源及保持历史记录可读，不再全量展示。
新肉类记录只填去骨可食生重；历史熟重和带骨记录保留营养快照，不换成生重数据。

来源：U.S. Department of Agriculture, Agricultural Research Service. FoodData Central.
类型：SR Legacy，April 2018；离线导入 7,793 条热量、蛋白质、脂肪、碳水四项齐全的记录。

- 官方下载页：https://fdc.nal.usda.gov/download-datasets/
- 本次数据包：https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
- 许可：https://fdc.nal.usda.gov/api-guide/#bkmk-6 （CC0 1.0 / public domain）
- 下载日期：2026-10-18。数据包校验值保存在 foods.json 的 archiveSha256。

数据字段选用 food_nutrient.csv 的 1008（Energy / kcal）、1003（Protein / g）、
1004（Total lipid / g）、1005（Carbohydrate by difference / g），按每 100 克可食部分计。
未使用 kJ 替代 kcal，也不把缺失值当零。所有营养数字来自下载文件，
中文索引不修改原营养值；数据库中不同品种或食物状态的差异保留。

## 中文索引

fitness-index.json 是当前常用库的中文名称、别名和称重说明，对应明确的 FDC ID，不是 USDA 的官方中文译名。
chinese-index.json 是以前的索引，仅用于历史数据兼容。
牛胸肉与中式牛腩切块并非完全一致，界面按部位和肥瘦说明，搜索牛腩会显示可参考的胸肉条目。
中国复合菜肴与具体品牌未纳入当前常用库。
名称相近不代表营养相同，不自动把搜索词匹配成一个固定的食物。

## 用户这次提出的食物

| FDC ID | 中文界面名称 | USDA 英文名称 |
|---|---|---|
| 170556 | 南瓜子仁（干燥） | Seeds, pumpkin and squash seed kernels, dried |
| 170557 | 南瓜子仁（烘烤无盐） | Seeds, pumpkin and squash seed kernels, roasted, without salt |
| 169415 | 南瓜子仁（烘烤加盐） | Seeds, pumpkin and squash seed kernels, roasted, with salt added |
| 172377 | 去皮琵琶腿（炖熟） | Chicken, broilers or fryers, drumstick, meat only, cooked, stewed |
| 172376 | 去皮琵琶腿（烤熟） | Chicken, broilers or fryers, dark meat, drumstick, meat only, cooked, roasted |
| 173614 | 去皮琵琶腿（生） | Chicken, broilers or fryers, dark meat, drumstick, meat only, raw |

琵琶腿以 USDA 的 chicken drumstick（鸡小腿）对应。带骨总重必须扣除实测骨重，
不提供未经验证的固定去骨系数。称量前后状态应相同；不要用生鸡腿总重减熟骨重。
未吃下的肉、油、酱汁不包含在纯肉条目的正确称重里。

## 历史记录

新记录保存营养快照、FDC ID、原英文描述、来源类型、版本和称重方式。
修改重量沿用当时的快照比例。旧版示例记录保留原值，并标记 legacy-example。
存储版本由 1 升到 2，兼容读取旧版本；读取异常时不覆盖原数据。
