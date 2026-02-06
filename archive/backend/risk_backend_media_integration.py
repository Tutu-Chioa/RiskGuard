"""
MediaCrawler Integration Module for Risk Management System
This module provides integration between MediaCrawler and the risk management backend
"""

import os
import sys
import asyncio
from typing import Optional, Dict, Any, List
import json
from datetime import datetime
import importlib.util

# 添加MediaCrawler到Python路径
MEDIA_CRAWLER_PATH = "/Users/chengzi/Downloads/MediaCrawler-main"
sys.path.insert(0, MEDIA_CRAWLER_PATH)

# 导入MediaCrawler模块
try:
    from media_platform.xhs import XiaoHongShuCrawler
    from media_platform.douyin import DouYinCrawler
    from media_platform.weibo import WeiboCrawler
    from media_platform.zhihu import ZhihuCrawler
    from base.base_crawler import AbstractCrawler
    from config.base_config import PLATFORM, KEYWORDS, CRAWLER_TYPE, ENABLE_IP_PROXY, HEADLESS
    import config.base_config as config_module
except ImportError as e:
    print(f"Failed to import MediaCrawler modules: {e}")
    raise

class MediaRiskCrawler:
    """
    媒体风险爬虫集成类
    将MediaCrawler与企业风控系统集成
    """
    
    def __init__(self):
        self.crawlers = {
            'xhs': XiaoHongShuCrawler,
            'dy': DouYinCrawler,
            'wb': WeiboCrawler,
            'zhihu': ZhihuCrawler,
        }
        self.active_crawlers = {}
    
    def configure_crawler(self, platform: str = "xhs", keywords: str = "企业风险,公司负面", 
                         crawler_type: str = "search", headless: bool = True):
        """
        配置爬虫参数
        """
        # 动态修改配置
        config_module.PLATFORM = platform
        config_module.KEYWORDS = keywords
        config_module.CRAWLER_TYPE = crawler_type
        config_module.HEADLESS = headless
        config_module.ENABLE_IP_PROXY = False  # 默认关闭代理以避免复杂性
        
        print(f"Configured crawler: platform={platform}, keywords={keywords}, type={crawler_type}")
    
    async def crawl_media_for_risk(self, platform: str = "xhs", keywords: str = "企业风险,公司负面",
                                   crawler_type: str = "search", max_notes: int = 10) -> List[Dict[str, Any]]:
        """
        爬取媒体数据用于风险分析
        """
        if platform not in self.crawlers:
            raise ValueError(f"Unsupported platform: {platform}. Supported: {list(self.crawlers.keys())}")
        
        # 临时修改配置
        original_max_notes = getattr(config_module, 'CRAWLER_MAX_NOTES_COUNT', 15)
        config_module.CRAWLER_MAX_NOTES_COUNT = max_notes
        
        # 创建爬虫实例
        crawler_class = self.crawlers[platform]
        crawler = crawler_class()
        
        try:
            # 启动爬虫
            await crawler.start()
            
            # 获取爬取结果（这里假设爬虫会将结果保存到某个地方）
            # 实际实现可能需要根据MediaCrawler的具体实现调整
            results = await self.extract_results(platform)
            
            return results
            
        except Exception as e:
            print(f"Error during crawling: {e}")
            raise
        finally:
            # 恢复原始配置
            config_module.CRAWLER_MAX_NOTES_COUNT = original_max_notes
    
    async def extract_results(self, platform: str) -> List[Dict[str, Any]]:
        """
        提取爬取结果
        """
        # 这里需要根据MediaCrawler的实际数据存储方式来实现
        # 通常MediaCrawler会将数据保存到文件或数据库中
        results = []
        
        # 查找保存的文件
        data_dir = os.path.join(MEDIA_CRAWLER_PATH, "data")
        platform_dir = os.path.join(data_dir, platform)
        
        if os.path.exists(platform_dir):
            for filename in os.listdir(platform_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(platform_dir, filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            if isinstance(data, list):
                                results.extend(data)
                            else:
                                results.append(data)
                    except Exception as e:
                        print(f"Error reading {filepath}: {e}")
        
        # 格式化结果为风险管理系统所需的格式
        formatted_results = []
        for item in results:
            formatted_item = self.format_for_risk_system(item, platform)
            formatted_results.append(formatted_item)
        
        return formatted_results
    
    def format_for_risk_system(self, item: Dict[str, Any], platform: str) -> Dict[str, Any]:
        """
        将爬取的数据格式化为风险管理系统所需的格式
        """
        # 根据不同平台的字段进行映射
        formatted = {
            "platform": platform,
            "source_url": item.get("url", ""),
            "title": item.get("title", item.get("desc", "")),
            "content": item.get("desc", item.get("content", "")),
            "publish_time": item.get("time", item.get("publish_time", "")),
            "author": item.get("nickname", item.get("author", "")),
            "likes": item.get("liked_count", item.get("digg_count", 0)),
            "comments": item.get("comment_count", 0),
            "shares": item.get("share_count", 0),
            "risk_keywords": self.extract_risk_keywords(item.get("desc", "") + " " + item.get("title", "")),
            "sentiment_score": self.calculate_sentiment_score(item.get("desc", "")),
            "created_at": datetime.now().isoformat()
        }
        
        return formatted
    
    def extract_risk_keywords(self, text: str) -> List[str]:
        """
        从文本中提取风险关键词
        """
        risk_keywords = [
            "风险", "危机", "亏损", "倒闭", "破产", "违法", "违规", "处罚", 
            "诉讼", "纠纷", "负面", "丑闻", "裁员", "债务", "违约", "制裁",
            "调查", "警告", "下架", "召回", "停产", "查封", "冻结"
        ]
        
        found_keywords = []
        text_lower = text.lower()
        for keyword in risk_keywords:
            if keyword in text_lower:
                if keyword not in found_keywords:
                    found_keywords.append(keyword)
        
        return found_keywords
    
    def calculate_sentiment_score(self, text: str) -> float:
        """
        计算情感分数 (-1.0 到 1.0, 负面到正面)
        """
        negative_words = [
            "差", "烂", "坏", "糟糕", "失望", "不满", "问题", "困难", "亏损", "下跌", 
            "危险", "风险", "危机", "违法", "违规", "处罚", "诉讼", "纠纷", "负面", 
            "丑闻", "裁员", "债务", "违约", "制裁", "调查", "警告", "下架", "召回", 
            "停产", "查封", "冻结", "倒闭", "破产", "裁员", "降薪", "拖欠", "跑路"
        ]
        
        positive_words = [
            "好", "优秀", "满意", "好评", "成功", "增长", "盈利", "发展", "创新", 
            "进步", "优势", "领先", "突破", "上涨", "扩张", "合作", "共赢", "稳定"
        ]
        
        text_lower = text.lower()
        neg_count = sum(1 for word in negative_words if word in text_lower)
        pos_count = sum(1 for word in positive_words if word in text_lower)
        
        total = neg_count + pos_count
        if total == 0:
            return 0.0
        
        score = (pos_count - neg_count) / total
        return max(-1.0, min(1.0, score))

    async def crawl_for_company(self, company_name: str, platforms: List[str] = ["xhs", "wb", "zhihu"]) -> Dict[str, Any]:
        """
        为企业爬取相关风险信息
        """
        all_results = {}
        
        for platform in platforms:
            try:
                print(f"Starting crawl for {company_name} on {platform}")
                # 使用公司名称作为关键词
                keywords = f"{company_name},公司负面,{company_name}风险"
                results = await self.crawl_media_for_risk(
                    platform=platform,
                    keywords=keywords,
                    crawler_type="search",
                    max_notes=5  # 限制数量以提高效率
                )
                all_results[platform] = results
                print(f"Completed crawl for {platform}, found {len(results)} items")
            except Exception as e:
                print(f"Error crawling {platform} for {company_name}: {e}")
                all_results[platform] = []
        
        # 综合分析
        analysis = self.analyze_company_risks(company_name, all_results)
        
        return {
            "company_name": company_name,
            "crawl_results": all_results,
            "risk_analysis": analysis,
            "crawl_timestamp": datetime.now().isoformat()
        }
    
    def analyze_company_risks(self, company_name: str, crawl_results: Dict[str, List]) -> Dict[str, Any]:
        """
        分析企业的风险信息
        """
        all_items = []
        for platform, items in crawl_results.items():
            all_items.extend(items)
        
        # 统计风险关键词
        all_risk_keywords = []
        negative_sentiment_count = 0
        total_items = len(all_items)
        
        for item in all_items:
            all_risk_keywords.extend(item.get("risk_keywords", []))
            if item.get("sentiment_score", 0) < -0.3:  # 负面情感
                negative_sentiment_count += 1
        
        # 统计唯一风险关键词
        unique_risk_keywords = list(set(all_risk_keywords))
        
        # 计算风险等级
        risk_level = self.calculate_risk_level(len(unique_risk_keywords), negative_sentiment_count, total_items)
        
        return {
            "total_items_found": total_items,
            "unique_risk_keywords": unique_risk_keywords,
            "negative_sentiment_ratio": negative_sentiment_count / total_items if total_items > 0 else 0,
            "risk_level": risk_level,
            "top_platforms": self.get_top_platforms(crawl_results),
            "latest_mentions": self.get_latest_mentions(all_items)
        }
    
    def calculate_risk_level(self, risk_keyword_count: int, negative_count: int, total_count: int) -> str:
        """
        计算风险等级
        """
        if total_count == 0:
            return "低"
        
        keyword_density = risk_keyword_count / total_count
        negative_ratio = negative_count / total_count
        
        # 基于关键词密度和负面情感比例计算风险等级
        score = (keyword_density * 0.6) + (negative_ratio * 0.4)
        
        if score > 0.3:
            return "高"
        elif score > 0.1:
            return "中"
        else:
            return "低"
    
    def get_top_platforms(self, crawl_results: Dict[str, List]) -> List[Dict[str, Any]]:
        """
        获取风险信息最多的平台
        """
        platform_stats = []
        for platform, items in crawl_results.items():
            risk_items = [item for item in items if item.get("risk_keywords")]
            platform_stats.append({
                "platform": platform,
                "total_items": len(items),
                "risk_items": len(risk_items),
                "percentage_with_risks": len(risk_items) / len(items) if items else 0
            })
        
        # 按风险项目数排序
        platform_stats.sort(key=lambda x: x["risk_items"], reverse=True)
        return platform_stats
    
    def get_latest_mentions(self, all_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        获取最近的提及
        """
        # 按时间排序（假设有时间字段）
        sorted_items = sorted(
            all_items, 
            key=lambda x: x.get("publish_time", ""), 
            reverse=True
        )
        return sorted_items[:5]  # 返回最新的5条

# 全局实例
media_crawler = MediaRiskCrawler()

# 以下是供Flask后端调用的函数
async def crawl_company_risks(company_name: str) -> Dict[str, Any]:
    """
    为指定公司爬取风险信息
    """
    try:
        results = await media_crawler.crawl_for_company(company_name)
        return results
    except Exception as e:
        print(f"Error crawling risks for {company_name}: {e}")
        return {
            "company_name": company_name,
            "error": str(e),
            "crawl_results": {},
            "risk_analysis": {
                "total_items_found": 0,
                "unique_risk_keywords": [],
                "negative_sentiment_ratio": 0,
                "risk_level": "未知",
                "top_platforms": [],
                "latest_mentions": []
            },
            "crawl_timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # 测试集成
    async def test_integration():
        print("Testing MediaCrawler integration...")
        
        # 测试为特定公司爬取风险信息
        results = await crawl_company_risks("阿里巴巴")
        print(f"Crawl results for Alibaba: {len(results['crawl_results'])} platforms")
        print(f"Risk level: {results['risk_analysis']['risk_level']}")
        print(f"Unique risk keywords: {results['risk_analysis']['unique_risk_keywords']}")
    
    # 运行测试
    asyncio.run(test_integration())