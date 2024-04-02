document.addEventListener('DOMContentLoaded', function () {
    fetchDataAndRenderCharts();
});

function fetchDataAndRenderCharts() {
    fetch('/api/douji/asset/total_balance', {
        method: 'POST', // 指定请求方法为 POST
        headers: {
            'Content-Type': 'application/json'
            // 如果需要，可以添加更多的头部信息，例如身份验证信息
        },
        // 如果 POST 请求需要包含数据，可以在此添加 body 属性
        // body: JSON.stringify({ key: 'value' })
    })
        .then(response => response.json())
        .then(data => {
            displayTotalBalance(data.balance);
            renderBarChartForCurrencies(data.detail);
            renderBarChart(data.detail);
            populateStockTable(data.detail);
            populateDetailsTable(data.detail);
        })
        .catch(error => console.error('Error:', error));
}

function displayTotalBalance(balance) {
    document.getElementById('total-balance').textContent = balance.toFixed(2);
}
const positiveColor = '#73C0DE'; // 正值颜色
const negativeColor = '#EE6666'; // 负值颜色

function renderBarChartForCurrencies(details) {

    // 计算每种货币的总余额
    let currencyBalances = details.reduce((acc, item) => {
        let currency = item.asset.currency;
        let balance = item.detail.cny_balance;

        if (!acc[currency]) {
            acc[currency] = 0;
        }
        acc[currency] += balance;
        return acc;
    }, {});

    // 准备 ECharts 需要的数据格式
    let categories = Object.keys(currencyBalances);
    let balances = Object.values(currencyBalances);

    // 使用 ECharts 渲染柱形图
    var barChart = echarts.init(document.getElementById('currency-bar-chart'));
    window.onresize = function () {
        barChart.resize();
    };
    var option = {
        title: {
            text: '货币余额总和',
            subtext: '柱状图',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        xAxis: {
            type: 'category',
            data: categories
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function (value, index) {
                    const tenK = 1e4;
                    if (value >= tenK || value < -tenK) {
                        value = value / tenK + 'w';
                    }
                    return value;
                }
            }
        },
        series: [{
            data: balances.map(
                item => ({
                    value: item,
                    itemStyle: {
                        color: item >= 0 ? positiveColor : negativeColor
                    }

                })
            ),
            type: 'bar'
        }]
    };
    barChart.setOption(option);
}
function log10(value) {
    return value === 0 ? 0 : value > 0 ? Math.log(value) / Math.log(10) : -Math.log(-value) / Math.log(10);
}
function renderBarChart(details) {
    details.sort((a, b) => b.detail.cny_balance - a.detail.cny_balance);

    var barChart = echarts.init(document.getElementById('balance-bar-chart'));
    // 当浏览器窗口大小变化时，调整图表大小
    window.onresize = function () {
        barChart.resize();
    };
    var option = {
        title: {
            text: '余额和负债',
            subtext: '柱状图',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '15%',  // 增加这个值来增加 Y 轴左边的空间
            // containLabel: true
        },
        yAxis: {
            axisLabel: {
                // rotate: 45,
                size: 15
            },
            type: 'category',
            data: details.map(item => item.asset.name)
        },
        xAxis: {
            type: 'value',
            minInterval: 1,
            axisLabel: {
                formatter: function (value, index) {
                    const tenK = 1e4;
                    if (value >= tenK || value < -tenK) {
                        value = value / tenK + 'w';
                    }
                    return value;
                }
            }
        },
        series: [{
            // barWidth: '60%',
            data: details.map(
                item => ({
                    value: Math.abs(log10(item.detail.cny_balance)),
                    itemStyle: {
                        color: item.detail.cny_balance >= 0 ? positiveColor : negativeColor
                    }
                })),
            type: 'bar'
        }]
    };
    barChart.setOption(option);
}

function currencyCodeToFlag(currencyCode) {
    const currencyFlags = {
        'CNY': '🇨🇳', // 香港港币
        'HKD': '🇭🇰', // 香港港币
        'NZD': '🇳🇿', // 新西兰元
        'AUD': '🇦🇺', // 澳大利亚元
        'USD': '🇺🇸', // 美元
        'EUR': '🇪🇺', // 欧元
        'CAD': '🇨🇦', // 加拿大元
        'GBP': '🇬🇧', // 英镑
        'JPY': '🇯🇵', // 日元
        'SGD': '🇸🇬', // 新加坡元
        'CHF': '🇨🇭'  // 瑞士法郎
    };

    return currencyFlags[currencyCode] || currencyCode;
}


function populateStockTable(details) {

    let brokersContainer = document.getElementById('brokers-container');
    console.log(details)

    brokes = details.filter(
        function (item) {
            return (item.asset.sub_type === 'stock' &&
                item.detail.stocks !== null)
        }
    )
    console.log(brokes)
    let allProfitLoss = 0;

    brokes.forEach(item => {
        console.log(item)
        // 创建表格
        let table = document.createElement('table');
        table.className = 'broker-table';
        let html = `
        <tr>
            <th>股票</th>
            <th>购买价</th>
            <th>当前价</th>
            <th>股数</th>
            <th>盈亏</th>
        </tr>`;

        let totalProfitLoss = 0;
        let isHKD = false

        item.detail.stocks.forEach(stock => {
            let profitLoss = (stock.price - stock.purchase_price) * stock.total_shares;
            totalProfitLoss += profitLoss;
            html += `<tr>
                    <td>${stock.symbol}</td>
                    <td>${stock.purchase_price}</td>
                    <td>${stock.price}</td>
                    <td>${stock.total_shares}</td>
                    <td>${profitLoss.toFixed(2)}</td>
                </tr>`;
            if (stock.symbol.includes('hk')) {
                isHKD = true
            }
        });

        html += `<tr><td colspan="4">总盈亏</td><td>${totalProfitLoss.toFixed(2)}</td></tr>`;
        table.innerHTML = html;
        allProfitLoss += totalProfitLoss * (isHKD ? 0.92 : 1)
        brokersContainer.appendChild(table);
    }
    );

    let table = document.createElement('table');
    table.className = 'broker-table';
    let html = `
    <tr>
        <th>总盈亏</th>
    </tr>
    <tr>
        <td>
            ${allProfitLoss.toFixed(2)}
        </td>
    </tr>
    `;
    table.innerHTML = html;
    brokersContainer.appendChild(table);
}


function populateDetailsTable(details) {
    const tableBody = document.getElementById('details-table').getElementsByTagName('tbody')[0];
    details.forEach(item => {
        const row = document.createElement('tr');

        // <th>名称</th>
        // <th>子类型</th>
        // <th>货币</th>
        // <th>余额</th>
        // <th>CNY</th>
        // <th>评论</th>
        // 对象的每个属性创建一个单元格
        row.innerHTML = `
            <td>${item.asset.name}</td>
            <td>${currencyCodeToFlag(item.asset.currency)}</td>
            <td>${item.asset.balance.toFixed(2)}</td>
            <td>${item.detail.cny_balance.toFixed(2)}</td>
            <td>${item.asset.comments}</td>
        `;

        document.querySelector('#details-table tbody').appendChild(row);
    });

}
