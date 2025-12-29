"""
@fileoverview: algorithms.py
@module: ml-service/app/api/v1/algorithms

Input:
#   - (no external imports)

Output:
#   - list_algorithms

Pos: ml-service/app/api/v1/algorithms.py
"""

from fastapi import APIRouter

router = APIRouter()

ALGORITHMS = [
    {
        "key": "frequency",
        "name": "频率分析",
        "description": "统计红蓝球出现频次作为推荐依据",
        "default_weight": 0.2,
    },
    {
        "key": "trend",
        "name": "趋势分析 (ARIMA)",
        "description": "使用时间序列模型捕捉周期性变化",
        "default_weight": 0.25,
    },
    {
        "key": "random_forest",
        "name": "随机森林",
        "description": "基于历史特征构建随机森林分类器",
        "default_weight": 0.3,
    },
    {
        "key": "lstm",
        "name": "LSTM 神经网络",
        "description": "利用循环神经网络建模号码序列",
        "default_weight": 0.25,
    },
    {
        "key": "ensemble",
        "name": "综合预测",
        "description": "按权重融合多种算法结果，权重可依据表现动态调整",
        "default_weight": 1.0,
    },
]


@router.get("/", summary="列出可用算法")
def list_algorithms():
    return {
        "items": ALGORITHMS,
        "count": len(ALGORITHMS),
    }
