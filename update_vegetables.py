#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
野菜類のビタミン・ミネラルデータを一括更新するスクリプト
日本食品標準成分表2020年版（八訂）から取得したデータをfoodDatabase.jsに統合
"""

import re
import json

# 野菜41件のビタミン・ミネラルデータ（八訂から取得）
VEGETABLE_DATA = {
    "ブロッコリー（生）": {
        "vitaminA": 75, "vitaminD": 0, "vitaminE": 3.0, "vitaminK": 210,
        "vitaminB1": 0.17, "vitaminB2": 0.23, "niacin": 1.0, "vitaminB6": 0.3,
        "vitaminB12": 0, "folicAcid": 220, "pantothenicAcid": 1.42, "biotin": 13.0, "vitaminC": 140,
        "sodium": 7, "potassium": 460, "calcium": 50, "magnesium": 29,
        "phosphorus": 110, "iron": 1.3, "zinc": 0.8, "copper": 0.1,
        "manganese": 0.28, "iodine": 0, "selenium": 2, "chromium": 0, "molybdenum": 11
    },
    "ほうれん草（生）": {
        "vitaminA": 350, "vitaminD": 0, "vitaminE": 2.1, "vitaminK": 270,
        "vitaminB1": 0.11, "vitaminB2": 0.2, "niacin": 0.6, "vitaminB6": 0.14,
        "vitaminB12": 0, "folicAcid": 210, "pantothenicAcid": 0.2, "biotin": 2.9, "vitaminC": 35,
        "sodium": 16, "potassium": 690, "calcium": 49, "magnesium": 69,
        "phosphorus": 47, "iron": 2.0, "zinc": 0.7, "copper": 0.11,
        "manganese": 0.32, "iodine": 3, "selenium": 3, "chromium": 2, "molybdenum": 5
    },
    "にんじん（生）": {
        "vitaminA": 720, "vitaminD": 0, "vitaminE": 0.4, "vitaminK": 17,
        "vitaminB1": 0.07, "vitaminB2": 0.06, "niacin": 0.8, "vitaminB6": 0.1,
        "vitaminB12": 0, "folicAcid": 21, "pantothenicAcid": 0.37, "biotin": 0, "vitaminC": 6,
        "sodium": 28, "potassium": 300, "calcium": 28, "magnesium": 10,
        "phosphorus": 26, "iron": 0.2, "zinc": 0.2, "copper": 0.05,
        "manganese": 0.12, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 0
    },
    "かぼちゃ（生）": {
        "vitaminA": 210, "vitaminD": 0, "vitaminE": 3.9, "vitaminK": 37,
        "vitaminB1": 0.07, "vitaminB2": 0.08, "niacin": 1.4, "vitaminB6": 0.23,
        "vitaminB12": 0, "folicAcid": 42, "pantothenicAcid": 0.62, "biotin": 1.9, "vitaminC": 43,
        "sodium": 1, "potassium": 430, "calcium": 22, "magnesium": 25,
        "phosphorus": 48, "iron": 0.4, "zinc": 0.3, "copper": 0.07,
        "manganese": 0.07, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 5
    },
    "トマト（生）": {
        "vitaminA": 45, "vitaminD": 0, "vitaminE": 0.9, "vitaminK": 4,
        "vitaminB1": 0.05, "vitaminB2": 0.02, "niacin": 0.7, "vitaminB6": 0.08,
        "vitaminB12": 0, "folicAcid": 22, "pantothenicAcid": 0.17, "biotin": 2.3, "vitaminC": 15,
        "sodium": 3, "potassium": 210, "calcium": 7, "magnesium": 9,
        "phosphorus": 26, "iron": 0.2, "zinc": 0.1, "copper": 0.04,
        "manganese": 0.08, "iodine": 0, "selenium": 1, "chromium": 0, "molybdenum": 2
    },
    "ミニトマト（生）": {
        "vitaminA": 80, "vitaminD": 0, "vitaminE": 0.9, "vitaminK": 7,
        "vitaminB1": 0.07, "vitaminB2": 0.05, "niacin": 0.8, "vitaminB6": 0.11,
        "vitaminB12": 0, "folicAcid": 35, "pantothenicAcid": 0.17, "biotin": 3.6, "vitaminC": 32,
        "sodium": 4, "potassium": 290, "calcium": 12, "magnesium": 13,
        "phosphorus": 29, "iron": 0.4, "zinc": 0.2, "copper": 0.06,
        "manganese": 0.1, "iodine": 4, "selenium": 0, "chromium": 0, "molybdenum": 4
    },
    "ピーマン（生）": {
        "vitaminA": 33, "vitaminD": 0, "vitaminE": 0.8, "vitaminK": 20,
        "vitaminB1": 0.03, "vitaminB2": 0.03, "niacin": 0.6, "vitaminB6": 0.19,
        "vitaminB12": 0, "folicAcid": 26, "pantothenicAcid": 0.3, "biotin": 1.6, "vitaminC": 76,
        "sodium": 1, "potassium": 190, "calcium": 11, "magnesium": 11,
        "phosphorus": 22, "iron": 0.4, "zinc": 0.2, "copper": 0.06,
        "manganese": 0.1, "iodine": 0, "selenium": 0, "chromium": 1, "molybdenum": 3
    },
    "パプリカ（赤・生）": {
        "vitaminA": 88, "vitaminD": 0, "vitaminE": 4.3, "vitaminK": 7,
        "vitaminB1": 0.06, "vitaminB2": 0.14, "niacin": 1.2, "vitaminB6": 0.37,
        "vitaminB12": 0, "folicAcid": 68, "pantothenicAcid": 0.28, "biotin": 0, "vitaminC": 170,
        "sodium": 0, "potassium": 210, "calcium": 7, "magnesium": 10,
        "phosphorus": 22, "iron": 0.4, "zinc": 0.2, "copper": 0.03,
        "manganese": 0.13, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 0
    },
    "パプリカ（黄・生）": {
        "vitaminA": 17, "vitaminD": 0, "vitaminE": 2.4, "vitaminK": 3,
        "vitaminB1": 0.04, "vitaminB2": 0.03, "niacin": 1.0, "vitaminB6": 0.26,
        "vitaminB12": 0, "folicAcid": 54, "pantothenicAcid": 0.25, "biotin": 0, "vitaminC": 150,
        "sodium": 0, "potassium": 200, "calcium": 8, "magnesium": 10,
        "phosphorus": 21, "iron": 0.3, "zinc": 0.2, "copper": 0.04,
        "manganese": 0.15, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 0
    },
    "小松菜（生）": {
        "vitaminA": 260, "vitaminD": 0, "vitaminE": 0.9, "vitaminK": 210,
        "vitaminB1": 0.09, "vitaminB2": 0.13, "niacin": 1.0, "vitaminB6": 0.12,
        "vitaminB12": 0, "folicAcid": 110, "pantothenicAcid": 0.32, "biotin": 2.9, "vitaminC": 39,
        "sodium": 15, "potassium": 500, "calcium": 170, "magnesium": 12,
        "phosphorus": 45, "iron": 2.8, "zinc": 0.2, "copper": 0.06,
        "manganese": 0.13, "iodine": 2, "selenium": 1, "chromium": 2, "molybdenum": 10
    },
    "チンゲン菜（生）": {
        "vitaminA": 170, "vitaminD": 0, "vitaminE": 0.7, "vitaminK": 84,
        "vitaminB1": 0.03, "vitaminB2": 0.07, "niacin": 0.3, "vitaminB6": 0.08,
        "vitaminB12": 0, "folicAcid": 66, "pantothenicAcid": 0.17, "biotin": 1.3, "vitaminC": 24,
        "sodium": 32, "potassium": 260, "calcium": 100, "magnesium": 16,
        "phosphorus": 27, "iron": 1.1, "zinc": 0.3, "copper": 0.07,
        "manganese": 0.12, "iodine": 0, "selenium": 1, "chromium": 1, "molybdenum": 7
    },
    "アスパラガス（生）": {
        "vitaminA": 31, "vitaminD": 0, "vitaminE": 1.5, "vitaminK": 43,
        "vitaminB1": 0.14, "vitaminB2": 0.15, "niacin": 1.0, "vitaminB6": 0.12,
        "vitaminB12": 0, "folicAcid": 190, "pantothenicAcid": 0.59, "biotin": 1.8, "vitaminC": 15,
        "sodium": 2, "potassium": 270, "calcium": 19, "magnesium": 9,
        "phosphorus": 60, "iron": 0.7, "zinc": 0.5, "copper": 0.1,
        "manganese": 0.19, "iodine": 1, "selenium": 0, "chromium": 0, "molybdenum": 2
    },
    "春菊（生）": {
        "vitaminA": 380, "vitaminD": 0, "vitaminE": 1.7, "vitaminK": 250,
        "vitaminB1": 0.1, "vitaminB2": 0.16, "niacin": 0.8, "vitaminB6": 0.13,
        "vitaminB12": 0, "folicAcid": 190, "pantothenicAcid": 0.23, "biotin": 3.5, "vitaminC": 19,
        "sodium": 73, "potassium": 460, "calcium": 120, "magnesium": 26,
        "phosphorus": 44, "iron": 1.7, "zinc": 0.2, "copper": 0.1,
        "manganese": 0.4, "iodine": 5, "selenium": 2, "chromium": 2, "molybdenum": 12
    },
    "さやいんげん（生）": {
        "vitaminA": 49, "vitaminD": 0, "vitaminE": 0.6, "vitaminK": 60,
        "vitaminB1": 0.06, "vitaminB2": 0.11, "niacin": 0.6, "vitaminB6": 0.07,
        "vitaminB12": 0, "folicAcid": 50, "pantothenicAcid": 0.17, "biotin": 4.5, "vitaminC": 8,
        "sodium": 1, "potassium": 260, "calcium": 50, "magnesium": 23,
        "phosphorus": 41, "iron": 0.7, "zinc": 0.3, "copper": 0.06,
        "manganese": 0.33, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 18
    },
    "オクラ（生）": {
        "vitaminA": 44, "vitaminD": 0, "vitaminE": 1.2, "vitaminK": 66,
        "vitaminB1": 0.09, "vitaminB2": 0.09, "niacin": 0.8, "vitaminB6": 0.1,
        "vitaminB12": 0, "folicAcid": 110, "pantothenicAcid": 0.42, "biotin": 6.6, "vitaminC": 11,
        "sodium": 4, "potassium": 280, "calcium": 92, "magnesium": 51,
        "phosphorus": 58, "iron": 0.5, "zinc": 0.6, "copper": 0.13,
        "manganese": 0.48, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 6
    },
    "枝豆（さやなし生）": {
        "vitaminA": 22, "vitaminD": 0, "vitaminE": 9.9, "vitaminK": 30,
        "vitaminB1": 0.31, "vitaminB2": 0.15, "niacin": 1.6, "vitaminB6": 0.15,
        "vitaminB12": 0, "folicAcid": 320, "pantothenicAcid": 0.53, "biotin": 11.0, "vitaminC": 27,
        "sodium": 1, "potassium": 590, "calcium": 58, "magnesium": 62,
        "phosphorus": 170, "iron": 2.7, "zinc": 1.4, "copper": 0.41,
        "manganese": 0.71, "iodine": 0, "selenium": 1, "chromium": 1, "molybdenum": 240
    },
    "キャベツ（生）": {
        "vitaminA": 2, "vitaminD": 0, "vitaminE": 0.1, "vitaminK": 79,
        "vitaminB1": 0.04, "vitaminB2": 0.03, "niacin": 0.2, "vitaminB6": 0.1,
        "vitaminB12": 0, "folicAcid": 66, "pantothenicAcid": 0.19, "biotin": 1.5, "vitaminC": 38,
        "sodium": 5, "potassium": 190, "calcium": 42, "magnesium": 14,
        "phosphorus": 26, "iron": 0.3, "zinc": 0.1, "copper": 0.02,
        "manganese": 0.13, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 2
    },
    "白菜（生）": {
        "vitaminA": 8, "vitaminD": 0, "vitaminE": 0.2, "vitaminK": 59,
        "vitaminB1": 0.03, "vitaminB2": 0.03, "niacin": 0.6, "vitaminB6": 0.09,
        "vitaminB12": 0, "folicAcid": 61, "pantothenicAcid": 0.25, "biotin": 1.4, "vitaminC": 19,
        "sodium": 6, "potassium": 220, "calcium": 43, "magnesium": 10,
        "phosphorus": 33, "iron": 0.3, "zinc": 0.2, "copper": 0.03,
        "manganese": 0.11, "iodine": 1, "selenium": 0, "chromium": 0, "molybdenum": 6
    },
    "レタス（生）": {
        "vitaminA": 20, "vitaminD": 0, "vitaminE": 0.5, "vitaminK": 29,
        "vitaminB1": 0.05, "vitaminB2": 0.03, "niacin": 0.2, "vitaminB6": 0.05,
        "vitaminB12": 0, "folicAcid": 73, "pantothenicAcid": 0.2, "biotin": 1.2, "vitaminC": 5,
        "sodium": 2, "potassium": 200, "calcium": 19, "magnesium": 8,
        "phosphorus": 22, "iron": 0.3, "zinc": 0.2, "copper": 0.04,
        "manganese": 0.13, "iodine": 1, "selenium": 0, "chromium": 0, "molybdenum": 0
    },
    "きゅうり（生）": {
        "vitaminA": 28, "vitaminD": 0, "vitaminE": 0.3, "vitaminK": 34,
        "vitaminB1": 0.03, "vitaminB2": 0.03, "niacin": 0.2, "vitaminB6": 0.05,
        "vitaminB12": 0, "folicAcid": 25, "pantothenicAcid": 0.33, "biotin": 1.4, "vitaminC": 14,
        "sodium": 1, "potassium": 200, "calcium": 26, "magnesium": 15,
        "phosphorus": 36, "iron": 0.3, "zinc": 0.2, "copper": 0.11,
        "manganese": 0.07, "iodine": 1, "selenium": 1, "chromium": 1, "molybdenum": 4
    },
    "なす（生）": {
        "vitaminA": 8, "vitaminD": 0, "vitaminE": 0.3, "vitaminK": 10,
        "vitaminB1": 0.05, "vitaminB2": 0.05, "niacin": 0.5, "vitaminB6": 0.05,
        "vitaminB12": 0, "folicAcid": 32, "pantothenicAcid": 0.33, "biotin": 2.3, "vitaminC": 4,
        "sodium": 0, "potassium": 220, "calcium": 18, "magnesium": 17,
        "phosphorus": 30, "iron": 0.3, "zinc": 0.2, "copper": 0.06,
        "manganese": 0.16, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 10
    },
    "大根（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0, "vitaminK": 0,
        "vitaminB1": 0.02, "vitaminB2": 0.01, "niacin": 0.2, "vitaminB6": 0.05,
        "vitaminB12": 0, "folicAcid": 33, "pantothenicAcid": 0.11, "biotin": 0.3, "vitaminC": 11,
        "sodium": 17, "potassium": 230, "calcium": 23, "magnesium": 10,
        "phosphorus": 17, "iron": 0.2, "zinc": 0.1, "copper": 0.02,
        "manganese": 0.04, "iodine": 3, "selenium": 1, "chromium": 0, "molybdenum": 2
    },
    "玉ねぎ（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0, "vitaminK": 0,
        "vitaminB1": 0.04, "vitaminB2": 0.01, "niacin": 0.1, "vitaminB6": 0.14,
        "vitaminB12": 0, "folicAcid": 15, "pantothenicAcid": 0.17, "biotin": 0.6, "vitaminC": 7,
        "sodium": 2, "potassium": 150, "calcium": 17, "magnesium": 9,
        "phosphorus": 31, "iron": 0.3, "zinc": 0.2, "copper": 0.05,
        "manganese": 0.15, "iodine": 1, "selenium": 1, "chromium": 0, "molybdenum": 1
    },
    "長ねぎ（生）": {
        "vitaminA": 7, "vitaminD": 0, "vitaminE": 0.2, "vitaminK": 8,
        "vitaminB1": 0.05, "vitaminB2": 0.04, "niacin": 0.4, "vitaminB6": 0.12,
        "vitaminB12": 0, "folicAcid": 72, "pantothenicAcid": 0.17, "biotin": 1, "vitaminC": 14,
        "sodium": 0, "potassium": 200, "calcium": 36, "magnesium": 13,
        "phosphorus": 27, "iron": 0.3, "zinc": 0.3, "copper": 0.04,
        "manganese": 0.12, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 2
    },
    "もやし（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0.1, "vitaminK": 3,
        "vitaminB1": 0.04, "vitaminB2": 0.05, "niacin": 0.3, "vitaminB6": 0.05,
        "vitaminB12": 0, "folicAcid": 41, "pantothenicAcid": 0.23, "biotin": 1.7, "vitaminC": 8,
        "sodium": 2, "potassium": 69, "calcium": 10, "magnesium": 8,
        "phosphorus": 25, "iron": 0.2, "zinc": 0.3, "copper": 0.08,
        "manganese": 0.06, "iodine": 2, "selenium": 0, "chromium": 0, "molybdenum": 55
    },
    "セロリ（生）": {
        "vitaminA": 4, "vitaminD": 0, "vitaminE": 0.2, "vitaminK": 10,
        "vitaminB1": 0.03, "vitaminB2": 0.03, "niacin": 0.1, "vitaminB6": 0.08,
        "vitaminB12": 0, "folicAcid": 29, "pantothenicAcid": 0.26, "biotin": 1.2, "vitaminC": 7,
        "sodium": 28, "potassium": 410, "calcium": 39, "magnesium": 9,
        "phosphorus": 39, "iron": 0.2, "zinc": 0.2, "copper": 0.03,
        "manganese": 0.11, "iodine": 1, "selenium": 0, "chromium": 0, "molybdenum": 2
    },
    "カリフラワー（生）": {
        "vitaminA": 2, "vitaminD": 0, "vitaminE": 0.2, "vitaminK": 17,
        "vitaminB1": 0.06, "vitaminB2": 0.11, "niacin": 0.7, "vitaminB6": 0.23,
        "vitaminB12": 0, "folicAcid": 94, "pantothenicAcid": 1.3, "biotin": 8.5, "vitaminC": 81,
        "sodium": 8, "potassium": 410, "calcium": 24, "magnesium": 18,
        "phosphorus": 68, "iron": 0.6, "zinc": 0.6, "copper": 0.05,
        "manganese": 0.22, "iodine": 0, "selenium": 0, "chromium": 0, "molybdenum": 4
    },
    "ごぼう（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0.6, "vitaminK": 0,
        "vitaminB1": 0.05, "vitaminB2": 0.04, "niacin": 0.4, "vitaminB6": 0.1,
        "vitaminB12": 0, "folicAcid": 68, "pantothenicAcid": 0.23, "biotin": 1.3, "vitaminC": 3,
        "sodium": 18, "potassium": 320, "calcium": 46, "magnesium": 54,
        "phosphorus": 62, "iron": 0.7, "zinc": 0.8, "copper": 0.21,
        "manganese": 0.18, "iodine": 2, "selenium": 1, "chromium": 1, "molybdenum": 1
    },
    "れんこん（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0.6, "vitaminK": 0,
        "vitaminB1": 0.1, "vitaminB2": 0.01, "niacin": 0.4, "vitaminB6": 0.09,
        "vitaminB12": 0, "folicAcid": 14, "pantothenicAcid": 0.89, "biotin": 2.9, "vitaminC": 48,
        "sodium": 24, "potassium": 440, "calcium": 20, "magnesium": 16,
        "phosphorus": 74, "iron": 0.5, "zinc": 0.3, "copper": 0.09,
        "manganese": 0.78, "iodine": 9, "selenium": 1, "chromium": 0, "molybdenum": 1
    },
    "じゃがいも（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0, "vitaminK": 1,
        "vitaminB1": 0.09, "vitaminB2": 0.03, "niacin": 1.5, "vitaminB6": 0.2,
        "vitaminB12": 0, "folicAcid": 20, "pantothenicAcid": 0.5, "biotin": 0.4, "vitaminC": 28,
        "sodium": 1, "potassium": 410, "calcium": 4, "magnesium": 19,
        "phosphorus": 47, "iron": 0.4, "zinc": 0.2, "copper": 0.09,
        "manganese": 0.37, "iodine": 1, "selenium": 0, "chromium": 4, "molybdenum": 3
    },
    "さつまいも（生）": {
        "vitaminA": 3, "vitaminD": 0, "vitaminE": 1.0, "vitaminK": 0,
        "vitaminB1": 0.1, "vitaminB2": 0.02, "niacin": 0.6, "vitaminB6": 0.2,
        "vitaminB12": 0, "folicAcid": 49, "pantothenicAcid": 0.48, "biotin": 4.8, "vitaminC": 25,
        "sodium": 23, "potassium": 380, "calcium": 40, "magnesium": 24,
        "phosphorus": 46, "iron": 0.5, "zinc": 0.2, "copper": 0.13,
        "manganese": 0.37, "iodine": 1, "selenium": 0, "chromium": 0, "molybdenum": 5
    },
    "里芋（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0.6, "vitaminK": 0,
        "vitaminB1": 0.07, "vitaminB2": 0.02, "niacin": 1.0, "vitaminB6": 0.15,
        "vitaminB12": 0, "folicAcid": 30, "pantothenicAcid": 0.48, "biotin": 3.1, "vitaminC": 6,
        "sodium": 0, "potassium": 640, "calcium": 10, "magnesium": 19,
        "phosphorus": 55, "iron": 0.5, "zinc": 0.3, "copper": 0.15,
        "manganese": 0.19, "iodine": 0, "selenium": 1, "chromium": 0, "molybdenum": 8
    },
    "長芋（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0.2, "vitaminK": 0,
        "vitaminB1": 0.1, "vitaminB2": 0.02, "niacin": 0.4, "vitaminB6": 0.09,
        "vitaminB12": 0, "folicAcid": 8, "pantothenicAcid": 0.61, "biotin": 2.2, "vitaminC": 6,
        "sodium": 3, "potassium": 430, "calcium": 17, "magnesium": 17,
        "phosphorus": 27, "iron": 0.4, "zinc": 0.3, "copper": 0.1,
        "manganese": 0.03, "iodine": 1, "selenium": 1, "chromium": 0, "molybdenum": 2
    },
    "しいたけ（生）": {
        "vitaminA": 0, "vitaminD": 0.3, "vitaminE": 0, "vitaminK": 0,
        "vitaminB1": 0.13, "vitaminB2": 0.21, "niacin": 3.4, "vitaminB6": 0.21,
        "vitaminB12": 0, "folicAcid": 49, "pantothenicAcid": 1.21, "biotin": 7.6, "vitaminC": 0,
        "sodium": 1, "potassium": 290, "calcium": 1, "magnesium": 14,
        "phosphorus": 87, "iron": 0.4, "zinc": 0.9, "copper": 0.1,
        "manganese": 0.21, "iodine": 0, "selenium": 5, "chromium": 1, "molybdenum": 4
    },
    "えのきたけ（生）": {
        "vitaminA": 0, "vitaminD": 0.9, "vitaminE": 0, "vitaminK": 0,
        "vitaminB1": 0.24, "vitaminB2": 0.17, "niacin": 6.8, "vitaminB6": 0.12,
        "vitaminB12": 0, "folicAcid": 75, "pantothenicAcid": 1.4, "biotin": 11.0, "vitaminC": 0,
        "sodium": 2, "potassium": 340, "calcium": 0, "magnesium": 15,
        "phosphorus": 110, "iron": 1.1, "zinc": 0.6, "copper": 0.1,
        "manganese": 0.07, "iodine": 0, "selenium": 1, "chromium": 0, "molybdenum": 0
    },
    "しめじ（生）": {
        "vitaminA": 0, "vitaminD": 0.5, "vitaminE": 0, "vitaminK": 0,
        "vitaminB1": 0.15, "vitaminB2": 0.17, "niacin": 6.1, "vitaminB6": 0.09,
        "vitaminB12": 0.1, "folicAcid": 29, "pantothenicAcid": 0.81, "biotin": 8.7, "vitaminC": 0,
        "sodium": 2, "potassium": 370, "calcium": 1, "magnesium": 11,
        "phosphorus": 96, "iron": 0.5, "zinc": 0.5, "copper": 0.06,
        "manganese": 0.16, "iodine": 1, "selenium": 2, "chromium": 0, "molybdenum": 6
    },
    "まいたけ（生）": {
        "vitaminA": 0, "vitaminD": 4.9, "vitaminE": 0, "vitaminK": 0,
        "vitaminB1": 0.09, "vitaminB2": 0.19, "niacin": 5.0, "vitaminB6": 0.06,
        "vitaminB12": 0, "folicAcid": 53, "pantothenicAcid": 0.56, "biotin": 24.0, "vitaminC": 0,
        "sodium": 0, "potassium": 230, "calcium": 0, "magnesium": 10,
        "phosphorus": 54, "iron": 0.2, "zinc": 0.7, "copper": 0.22,
        "manganese": 0.04, "iodine": 0, "selenium": 2, "chromium": 1, "molybdenum": 1
    },
    "エリンギ（生）": {
        "vitaminA": 0, "vitaminD": 1.2, "vitaminE": 0, "vitaminK": 0,
        "vitaminB1": 0.11, "vitaminB2": 0.22, "niacin": 6.1, "vitaminB6": 0.14,
        "vitaminB12": 0, "folicAcid": 65, "pantothenicAcid": 1.16, "biotin": 6.9, "vitaminC": 0,
        "sodium": 2, "potassium": 340, "calcium": 0, "magnesium": 12,
        "phosphorus": 89, "iron": 0.3, "zinc": 0.6, "copper": 0.1,
        "manganese": 0.06, "iodine": 1, "selenium": 2, "chromium": 0, "molybdenum": 2
    },
    "アボカド（生）": {
        "vitaminA": 7, "vitaminD": 0, "vitaminE": 3.3, "vitaminK": 21,
        "vitaminB1": 0.09, "vitaminB2": 0.2, "niacin": 2.3, "vitaminB6": 0.29,
        "vitaminB12": 0, "folicAcid": 83, "pantothenicAcid": 1.65, "biotin": 5.3, "vitaminC": 12,
        "sodium": 7, "potassium": 590, "calcium": 8, "magnesium": 34,
        "phosphorus": 52, "iron": 0.6, "zinc": 0.7, "copper": 0.24,
        "manganese": 0.19, "iodine": 0, "selenium": 1, "chromium": 0, "molybdenum": 2
    },
    "にんにく（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0.5, "vitaminK": 0,
        "vitaminB1": 0.19, "vitaminB2": 0.07, "niacin": 0.7, "vitaminB6": 1.53,
        "vitaminB12": 0, "folicAcid": 93, "pantothenicAcid": 0.55, "biotin": 1.1, "vitaminC": 12,
        "sodium": 8, "potassium": 510, "calcium": 14, "magnesium": 24,
        "phosphorus": 160, "iron": 0.8, "zinc": 0.8, "copper": 0.16,
        "manganese": 0.28, "iodine": 0, "selenium": 1, "chromium": 0, "molybdenum": 16
    },
    "しょうが（生）": {
        "vitaminA": 0, "vitaminD": 0, "vitaminE": 0.1, "vitaminK": 0,
        "vitaminB1": 0.03, "vitaminB2": 0.02, "niacin": 0.8, "vitaminB6": 0.13,
        "vitaminB12": 0, "folicAcid": 8, "pantothenicAcid": 0.21, "biotin": 0.1, "vitaminC": 2,
        "sodium": 6, "potassium": 270, "calcium": 12, "magnesium": 27,
        "phosphorus": 25, "iron": 0.5, "zinc": 0.1, "copper": 0.06,
        "manganese": 5.01, "iodine": 0, "selenium": 1, "chromium": 1, "molybdenum": 6
    }
}


def update_vegetable_data(file_path):
    """
    foodDatabase.jsの野菜類データにビタミン・ミネラルを追加する

    Args:
        file_path: foodDatabase.jsのパス
    """
    # ファイルを読み込み
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 野菜ごとに更新
    for veg_name, nutrients in VEGETABLE_DATA.items():
        # 正規表現で該当する野菜の行を検索
        # 例: "ブロッコリー（生）": { ... },
        pattern = rf'("{re.escape(veg_name)}"\s*:\s*\{{[^}}]+\}})'

        match = re.search(pattern, content)
        if not match:
            print(f"[WARN] {veg_name} が見つかりませんでした")
            continue

        old_line = match.group(1)

        # 既存のデータをパース
        # JSON形式に変換して読み込む
        try:
            # JavaScriptオブジェクトをJSON形式に変換
            json_str = old_line.replace(f'"{veg_name}":', '').strip()
            if json_str.endswith(','):
                json_str = json_str[:-1]  # 末尾のカンマを削除

            # シングルクォートをダブルクォートに変換
            json_str = json_str.replace("'", '"')

            existing_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[WARN] {veg_name} のパースに失敗: {e}")
            # 正規表現で既存フィールドを抽出
            existing_data = {}

        # 新しいデータを作成（既存データ + 新規栄養素）
        # 順序: 基本情報 → ビタミン → ミネラル → その他
        new_data = {}

        # 基本情報を保持
        for key in ['calories', 'protein', 'fat', 'carbs', 'sugar', 'fiber', 'solubleFiber', 'insolubleFiber',
                    'unit', 'servingSize', 'servingUnit', 'category', 'cost']:
            if key in existing_data:
                new_data[key] = existing_data[key]

        # ビタミンを追加
        for key in ['vitaminA', 'vitaminD', 'vitaminE', 'vitaminK', 'vitaminB1', 'vitaminB2',
                    'niacin', 'vitaminB6', 'vitaminB12', 'folicAcid', 'pantothenicAcid', 'biotin', 'vitaminC']:
            new_data[key] = nutrients[key]

        # ミネラルを追加
        for key in ['sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc',
                    'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum']:
            new_data[key] = nutrients[key]

        # その他の情報を保持
        for key in ['betaCarotene', 'aminoAcidScore', 'pdcaas', 'diaas', 'gi']:
            if key in existing_data:
                new_data[key] = existing_data[key]

        # 新しい行を作成
        fields = []
        for key, value in new_data.items():
            if isinstance(value, str):
                fields.append(f'"{key}": "{value}"')
            else:
                fields.append(f'"{key}": {value}')

        new_line = f'"{veg_name}": {{ {", ".join(fields)} }}'

        # 置換
        content = content.replace(old_line, new_line)
        print(f"[OK] {veg_name} を更新しました")

    # ファイルに書き込み
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n[OK] 完了: {len(VEGETABLE_DATA)}件の野菜を更新しました")


if __name__ == '__main__':
    file_path = r'C:\Users\yourc\yourcoach_new\src\foodDatabase.js'
    update_vegetable_data(file_path)
