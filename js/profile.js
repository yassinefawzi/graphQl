let skillsObj = []
let userLogIn = ""
let userXp = 0
let userRatio = 0
let userUp = 0
let userDown = 0
let userFullName = ""
let userLvl = 0

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('jwtToken')
  if (!token) {
    window.location.href = 'index.html'
    return
  }

  try {
    const query = `
      query {
        user {
          id
          login
          firstName
          lastName

          level: transactions(
          where: {type: {_eq: "level"}}
          order_by: [{createdAt: desc} {id: desc}]) {
            amount
          }
          transactions(
			where: {
				type: {_eq: "xp"},
				event: {object: {name: {_eq: "Module"}}}
			},
			order_by: {createdAt: asc}
			) {
			amount
			createdAt
			}
			
          upTransactions: transactions(where: { type: { _eq: "up" } }) {
            amount
          }

          downTransactions: transactions(where: { type: { _eq: "down" } }) {
            amount
          }

          skillTransactions: transactions(where: { type: { _like: "skill%" } }) {
            type
            amount
            object {
              id
              name
              type
            }
          }
        }
      }
    `

    const response = await fetch("https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })

    const result = await response.json()

    if (result.errors) {
      console.error('GraphQL errors:', JSON.stringify(result.errors, null, 2))
      localStorage.removeItem('jwtToken')
      window.location.href = 'index.html'
      return
    }

    const userData = result.data.user[0]
    if (!userData) {
      console.error('User data not found in the response')
      localStorage.removeItem('jwtToken')
      window.location.href = 'index.html'
      return
    }
    // User Name
    userLogIn = userData.login
    userFullName = userData.firstName + " " + userData.lastName

    userLvl = Number(userData.level[0]?.amount ?? 0)
    // User Xp
    const totalXPBytes = userData.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
    userXp = Math.ceil(totalXPBytes / 1000)
	const xpOverTime = userData.transactions.map(tx => ({
		date: new Date(tx.createdAt),
		amount: Number(tx.amount)
	}))

    // Sum audit UP/DOWN
    userUp = userData.upTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
	userUp = (userUp / 1000).toFixed(0)
    userDown = userData.downTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
	userDown = (userDown / 1000).toFixed(0)

    // Audit ratio
    userRatio = userDown === 0 ? 1 : (userUp / userDown).toFixed(2)

    // Skills array
    const skills = userData.skillTransactions.map(tx => ({
      type: tx.type,
      amount: Number(tx.amount),
      objectId: tx.object?.id,
      name: tx.object?.name,
      objectType: tx.object?.type,
    }))
    // Group skills by type and sum amounts
    const skillMap = new Map()
    skills.forEach(skill => {
      const key = skill.type
      if (!skillMap.has(key)) {
        skillMap.set(key, 0)
      }
      if (skill.amount > skillMap.get(key)) {
        skillMap.set(key, skill.amount)
      }
    })
    // Convert Map to Array of Objects
    skillsObj = Array.from(skillMap.entries().map(([type, amount]) => ({type,amount}))).sort((a, b) => b.amount - a.amount)

	const nameDiv = document.getElementById("name")
	const nameh1 = document.createElement("h1")
	nameh1.textContent = "Hello " + userFullName
	nameDiv.appendChild(nameh1)
    drawInfo()
	drawBarChart()
	drawAudit()
	const groupedXp = groupXpByDay(xpOverTime)
	drawXp(groupedXp)
  } catch (error) {
    console.error('Error fetching user data:', error)
	localStorage.removeItem('jwtToken')
    window.location.href = 'index.html'
    alert('Failed to load user data. Please try again later.')
  }
})

document.getElementById('logOutButton').addEventListener('click', () => {
  localStorage.removeItem('jwtToken')
  window.location.href = 'index.html'
  console.log("Logged out")
})


function drawBarChart() {
	const svg = document.getElementById("skillGraph")
	svg.innerHTML = ''

	const barHeight = 10
	const padding = 20
	skillsObj.forEach((skill, index) => {
		const barHeight = 10
		const labelOffset = 15
		const spacing = 50
		const yStart = padding + index * spacing

		const chartWidth = svg.viewBox.baseVal.width - padding * 2 - 100
		const barLength = (skill.amount / 100) * chartWidth

		const container = document.createElementNS("http://www.w3.org/2000/svg", "rect")
		container.setAttribute("x", padding - 10)
		container.setAttribute("y", yStart - labelOffset)
		container.setAttribute("width", chartWidth + 130)
		container.setAttribute("height", spacing - 5)
		container.setAttribute("rx", 10)
		container.setAttribute("fill", "#867070")
		svg.appendChild(container)

		const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
		label.setAttribute("x", padding)
		label.setAttribute("y", yStart)
		label.setAttribute("font-size", "14")
		label.setAttribute("fill", "#f4fcfb")
		label.setAttribute("text-anchor", "start")
		label.textContent = skill.type.replace('skill_', '')
		svg.appendChild(label)

		const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
		bgRect.setAttribute("x", padding)
		bgRect.setAttribute("y", yStart + 5)
		bgRect.setAttribute("width", chartWidth)
		bgRect.setAttribute("height", barHeight)
		bgRect.setAttribute("fill", "#705d5d")
		svg.appendChild(bgRect)

		const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
		rect.setAttribute("x", padding)
		rect.setAttribute("y", yStart + 5)
		rect.setAttribute("width", barLength)
		rect.setAttribute("height", barHeight)
		rect.setAttribute("fill", "#f4fcfb")
		svg.appendChild(rect)

		const percentText = document.createElementNS("http://www.w3.org/2000/svg", "text")
		percentText.setAttribute("x", padding + chartWidth + 10)
		percentText.setAttribute("y", yStart + barHeight / 2 + 8)
		percentText.setAttribute("font-size", "12")
		percentText.setAttribute("fill", "#f4fcfb")
		percentText.textContent = `${skill.amount}%`
		svg.appendChild(percentText)
	})

}


function drawInfo() {
	const div = document.getElementById("info")
	const svg = document.getElementById("infoGraph")
	const vb = svg.viewBox.baseVal
	svg.innerHTML = ''

	const cx = vb.width / 2
	const cy = vb.height / 2
	const radius = Math.min(vb.width, vb.height) / 2 * 0.8
	const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
	circle.setAttribute('cx', cx)
	circle.setAttribute('cy', cy)
	circle.setAttribute('r', radius)
	circle.setAttribute('fill', '#867070')
	circle.setAttribute('stroke', '#817676')
	circle.setAttribute('stroke-width', radius * 0.1)
	svg.appendChild(circle)

	const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
	text.setAttribute('x', cx);
	text.setAttribute('y', cy + radius * 0.25);
	text.setAttribute('text-anchor', 'middle');
	text.setAttribute('font-size', radius * 0.8);
	text.setAttribute('fill', '#f4fcfb');
	text.setAttribute('font-family', 'Arial, sans-serif');
	text.textContent = userLvl;
	svg.appendChild(text);
	xp = document.createElement("h1")
	xp.textContent = "total Xp: " + userXp + " Kb"
	div.appendChild(xp)
}

function drawAudit() {
	const svg = document.getElementById("auditGraph")
	const div = document.getElementById("auditStat")
	const vb = svg.viewBox.baseVal
	svg.innerHTML = ''

	const cx = vb.width / 2
	const cy = vb.height / 2
	const radius = Math.min(vb.width, vb.height) / 2 * 0.8
	const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
	circle.setAttribute('cx', cx)
	circle.setAttribute('cy', cy)
	circle.setAttribute('r', radius)
	circle.setAttribute('fill', '#867070')
	circle.setAttribute('stroke', '#817676')
	circle.setAttribute('stroke-width', radius * 0.1)
	svg.appendChild(circle)

	const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
	text.setAttribute('x', cx);
	text.setAttribute('y', cy + radius * 0.25);
	text.setAttribute('text-anchor', 'middle');
	text.setAttribute('font-size', radius * 0.6);
	text.setAttribute('fill', '#f4fcfb');
	text.setAttribute('font-family', 'Arial, sans-serif');
	text.textContent = userRatio + "%";
	svg.appendChild(text);

	const up = document.createElement("h2")
	const down = document.createElement("h2")
	up.textContent = "Done: " + userUp + "Kb"
	down.textContent = "Received: " + userDown + "Kb"
	div.append(up, down)
}

function groupXpByDay(xpData) {
  const grouped = {}

  xpData.forEach(tx => {
    const date = new Date(tx.date)
    const key = date.toISOString().split("T")[0]
    if (!grouped[key]) {
      grouped[key] = 0
    }
    grouped[key] += tx.amount
  })

  return Object.entries(grouped).map(([day, amount]) => ({
    date: new Date(day),
    amount
  }))
}

function drawXp(xpData) {
	const svg = document.getElementById("xpGraph")
	svg.innerHTML = ""

	const vb = svg.viewBox.baseVal
	const padding = 40
	const width = vb.width - padding * 2
	const height = vb.height - padding * 2

	let cumulativeXP = 0
	const points = xpData.map((tx, index) => {
		cumulativeXP += tx.amount
		return {
			x: index,
			xp: cumulativeXP / 1000 
		}
	})

	if (points.length === 0) return

	const maxXP = Math.max(...points.map(p => p.xp))
	const stepX = width / Math.max(points.length - 1, 1)

	const scaledPoints = points.map((p, i) => ({
		x: padding + i * stepX,
		y: padding + height * (1 - p.xp / maxXP),
		label: p.xp.toFixed(0)
	}))

	const path = scaledPoints.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ")
	const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path")
	pathElement.setAttribute("d", path)
	pathElement.setAttribute("stroke", "#f4fcfb")
	pathElement.setAttribute("fill", "none")
	pathElement.setAttribute("stroke-width", 2)
	svg.appendChild(pathElement)

	scaledPoints.forEach(p => {
		const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle")
		dot.setAttribute("cx", p.x)
		dot.setAttribute("cy", p.y)
		dot.setAttribute("r", 3)
		dot.setAttribute("fill", "#f4fcfb")
		svg.appendChild(dot)

		const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
		label.setAttribute("x", p.x)
		label.setAttribute("y", p.y - 8)
		label.setAttribute("text-anchor", "middle")
		label.setAttribute("font-size", "10")
		label.setAttribute("fill", "#f4fcfb")
		label.textContent = p.label + ' Kb'
		svg.appendChild(label)
	})
}
523