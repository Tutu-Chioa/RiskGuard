import React from 'react';

const SystemDocsPage = () => (
  <div className="p-4 md:p-6 max-w-4xl mx-auto">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">系统说明</h1>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
      数据计算依据与系统运行逻辑说明，便于理解各模块含义与数据流。
    </p>

    <div className="space-y-8 text-gray-700 dark:text-gray-300">
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">一、系统运行逻辑概览</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li><strong>添加/导入企业</strong>：写入 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">companies</code> 后，后台自动执行：工商信息（LLM 或爬虫）→ 相关新闻（大模型联网搜索）→ 媒体舆情（小红书等爬取）。</li>
          <li><strong>相关新闻</strong>：写入 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">company_news</code>，每条带 <code>risk_level</code>（高/中/低）、<code>category</code>（法律/财务/经营/舆情等）。</li>
          <li><strong>事件特征</strong>：从 <code>company_news</code> 抽取为 <code>enterprise_event_feature</code>（事件类型、严重度、情绪等），供时间序列聚合。</li>
          <li><strong>风险时间序列</strong>：按日、按企业从 <code>enterprise_event_feature</code> 聚合成 <code>enterprise_risk_timeseries</code>，得到每日 <code>risk_score</code>（0–100）及各维度得分。</li>
          <li><strong>企业风险等级</strong>：<code>companies.risk_level</code> 由「相关新闻」中风险等级汇总（取最高：高 &gt; 中 &gt; 低）；无社会评价时也可根据新闻显示，不再固定为「未知」。</li>
          <li><strong>风险预测</strong>：基于 <code>enterprise_risk_timeseries</code> 最近 N 天做线性趋势 + 宏观指数调整，得到未来若干天的点预测与区间；宏观指数来自「最新政策与市场环境」新闻的日度汇总。</li>
          <li><strong>风险警报</strong>：当出现高风险新闻或企业风险等级升为「高」时写入 <code>risk_alerts</code>，供风险警报页展示并可标记处理。</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">二、主要数据计算依据</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">1. 企业风险等级（companies.risk_level）</h3>
            <p>由该企业 <code>company_news</code> 中所有条目的 <code>risk_level</code> 取<strong>最高档</strong>（高 &gt; 中 &gt; 低）得到；写入/更新新闻后自动刷新，无需社会评价即可显示高/中/低。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">2. 事件特征（enterprise_event_feature）</h3>
            <p>每条相关新闻映射为一条事件：<code>category</code> 映射为事件类型（法律/经营/财务/舆情等），<code>risk_level</code> 映射为严重度（高→0.8、中→0.5、低→0.2），再结合情绪做微调。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">3. 每日风险得分（enterprise_risk_timeseries.risk_score）</h3>
            <p>当日所有事件按维度（法律/经营/舆情/政策/行业）取平均严重度，再按权重（如 0.25、0.25、0.2、0.15、0.15）加权得到 0–100 分。若任一方为高风险（≥0.6），当日得分保底 58，使趋势图与「相关新闻为高」一致。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">4. 风险预测</h3>
            <p>用最近 30 天 <code>risk_score</code> 做线性拟合得到斜率和末点；用最近一天宏观指数做水平调整（可配置幅度与中性值）；未来第 i 天预测值 = 末点 + 斜率×i + 调整，并裁剪到 [0,100]。若存在回测残差标准差，可给出约 95% 预测区间。</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">5. 宏观指数（macro_daily_index）</h3>
            <p>由「最新政策与市场环境」新闻按日汇总得到 <code>policy_score</code> / <code>macro_risk_score</code>（0–1），用于预测时的宏观调整及说明文案。</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">整体计算过程与底层逻辑</h2>
        <p className="text-sm mb-3">从原始数据到风险分、再到预测的完整数据流与公式如下；详细公式、回测指标定义与代码位置见项目文档 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">docs/计算过程与底层逻辑.md</code>。</p>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li><strong>原始数据</strong>：企业相关新闻（<code>company_news</code>）、政策与市场环境（<code>macro_policy_news</code>）。</li>
          <li><strong>事件特征</strong>：每条新闻 → <code>event_type</code>（按 category）+ <code>severity_score</code>（按 risk_level 高/中/低→0.8/0.5/0.2，再按情绪 ±0.1～0.2）。</li>
          <li><strong>每日风险分</strong>：按日聚合事件特征 → 法律/经营/舆情/政策/行业五维平均严重度 → 加权（0.25, 0.25, 0.2, 0.15, 0.15）×100；任一方≥0.6 时保底 58 分。</li>
          <li><strong>宏观指数</strong>：政策新闻按日汇总 → <code>policy_score</code>、<code>macro_risk_score</code>（0–1），供预测水平调整。</li>
          <li><strong>点预测</strong>：最近 30 天 <code>risk_score</code> 最小二乘得斜率 + 末点；调整 = 配置幅度×(宏观分−中性值)，限制±10；未来第 i 天 = clip(末点 + 斜率×i + 调整, 0, 100)。</li>
          <li><strong>预测区间</strong>：用回测得到的残差标准差 × z（默认 1.96）得到约 95% 区间，再裁剪到 [0,100]。</li>
          <li><strong>回测与准确度</strong>：历史上每个 T 用 [T−30, T] 线性外推 T+7/T+30，与真实值比较 → MAE、RMSE、方向准确率、相对朴素基准提升、残差标准差（写入 <code>backtest_metrics</code>）。</li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">三、关键表与数据流</h2>
        <table className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th className="px-3 py-2 text-left font-medium">表/概念</th>
              <th className="px-3 py-2 text-left font-medium">说明</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200 dark:border-gray-600"><td className="px-3 py-2">companies</td><td>企业基本信息；risk_level 由新闻汇总或社会评价更新</td></tr>
            <tr className="border-t border-gray-200 dark:border-gray-600"><td className="px-3 py-2">company_news</td><td>企业相关新闻，含 risk_level、category、risk_dimensions</td></tr>
            <tr className="border-t border-gray-200 dark:border-gray-600"><td className="px-3 py-2">enterprise_event_feature</td><td>由新闻等抽取的事件特征（类型、严重度、情绪）</td></tr>
            <tr className="border-t border-gray-200 dark:border-gray-600"><td className="px-3 py-2">enterprise_risk_timeseries</td><td>按日聚合的风险得分与各维度分</td></tr>
            <tr className="border-t border-gray-200 dark:border-gray-600"><td className="px-3 py-2">macro_daily_index</td><td>按日宏观指数，供预测调整</td></tr>
            <tr className="border-t border-gray-200 dark:border-gray-600"><td className="px-3 py-2">prediction_config</td><td>预测参数（宏观调整幅度、区间 z 值等）</td></tr>
            <tr className="border-t border-gray-200 dark:border-gray-600"><td className="px-3 py-2">risk_alerts</td><td>风险警报记录</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">四、管理端操作</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><strong>重建事件特征</strong>：从 <code>company_news</code> 重新生成 <code>enterprise_event_feature</code>，并同步更新企业 <code>risk_level</code>。</li>
          <li><strong>重建风险时间序列</strong>：从 <code>enterprise_event_feature</code> 重新计算 <code>enterprise_risk_timeseries</code>。</li>
          <li><strong>回测</strong>：<code>GET /api/v1/predict/backtest</code> 可得到历史预测误差与残差标准差，用于预测区间。</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">五、用 DB Browser 查看数据库</h2>
        <p className="text-sm mb-2">本系统使用 SQLite，数据库文件为 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">risk_platform.db</code>。开发运行时位于 <strong>项目根目录下的 data/risk_platform.db</strong>（例如 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/Users/你的用户名/Desktop/sys2/data/risk_platform.db</code>）；打包成 .app 时位于 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">~/Library/Application Support/RiskGuard/risk_platform.db</code>。</p>
        <p className="text-sm mb-2">在 <strong>DB Browser for SQLite</strong> 中：<strong>文件 → 打开数据库</strong>，选择上述路径下的 <code>risk_platform.db</code> 即可查看并与系统共用同一库（系统写入后可在 DB Browser 中「读取数据库」刷新；在 DB Browser 中修改并「写入更改」后系统会读到新数据）。大量修改建议先关闭本系统再改，避免锁库。详细步骤见项目 <code>docs/DB_BROWSER_使用说明.md</code>。</p>
      </section>
    </div>
  </div>
);

export default SystemDocsPage;
