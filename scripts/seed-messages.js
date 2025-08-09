#!/usr/bin/env node --env-file=.env

import { createClient } from '@libsql/client'

// Generate realistic dates over the past 90 days
function generateDate(daysAgo) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

// Sample user agents
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

// Sample IP addresses
const ipAddresses = ['192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.0', '198.51.100.42']

// Message templates
const messages = [
  {
    daysAgo: 0,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    subject: 'Question about pricing',
    message:
      "Hi, I was wondering if you offer any discounts for annual subscriptions? I'm interested in the Pro plan but would like to know about long-term pricing options.",
    is_read: false,
  },
  {
    daysAgo: 1,
    name: 'Michael Chen',
    email: 'mchen@techcorp.com',
    subject: 'Integration with existing systems',
    message:
      "We're evaluating your platform for our company. Can you provide documentation on API integrations? We need to connect with our existing CRM and inventory management systems.",
    is_read: false,
  },
  {
    daysAgo: 2,
    name: 'Emily Rodriguez',
    email: 'emily.r@startup.io',
    subject: 'Feature request',
    message:
      'Love your product! Would it be possible to add bulk export functionality? This would really help our team with monthly reporting.',
    is_read: true,
  },
  {
    daysAgo: 3,
    name: 'David Thompson',
    email: 'david.thompson@gmail.com',
    subject: 'Technical support needed',
    message:
      "I'm having trouble with the dashboard loading slowly. I've tried clearing cache and using different browsers. Can someone help troubleshoot this issue?",
    is_read: true,
  },
  {
    daysAgo: 5,
    name: 'Lisa Wang',
    email: 'lwang@enterprise.com',
    subject: 'Enterprise plan inquiry',
    message:
      'Our organization needs a solution for 500+ users. Do you offer enterprise plans with dedicated support and custom SLAs? Please send pricing information.',
    is_read: true,
  },
  {
    daysAgo: 7,
    name: 'James Wilson',
    email: 'james.w@freelance.net',
    subject: 'Partnership opportunity',
    message:
      "I run a consultancy that helps businesses with digital transformation. I'd like to discuss becoming a certified partner. What are the requirements and benefits?",
    is_read: true,
  },
  {
    daysAgo: 10,
    name: 'Amanda Foster',
    email: 'afoster@edu.org',
    subject: 'Educational discount',
    message:
      "Hello, I'm a professor at State University. Do you offer educational discounts for academic institutions? We'd like to use your platform for our computer science courses.",
    is_read: true,
  },
  {
    daysAgo: 14,
    name: 'Robert Martinez',
    email: 'rmartinez@retail.com',
    subject: 'Migration from competitor',
    message:
      "We're currently using a competitor's solution but are looking to switch. Do you provide migration assistance? We have about 10,000 records to transfer.",
    is_read: true,
    is_archived: true,
  },
  {
    daysAgo: 18,
    name: 'Jennifer Lee',
    email: 'jlee@agency.co',
    subject: 'Multi-tenant capabilities',
    message:
      'We manage multiple client accounts. Does your platform support multi-tenant architecture where we can manage separate environments for each client?',
    is_read: true,
  },
  {
    daysAgo: 21,
    name: 'Thomas Brown',
    email: 'tbrown@logistics.com',
    subject: 'Compliance and security',
    message:
      'Can you provide information about your security certifications? We need SOC 2 Type II compliance for our industry. Also interested in data encryption details.',
    is_read: true,
  },
  {
    daysAgo: 25,
    name: 'Sophie Anderson',
    email: 'sophie@design.studio',
    subject: 'UI customization options',
    message:
      "Is it possible to white-label the interface? We'd like to match our brand colors and add our logo. What level of customization is available?",
    is_read: true,
    is_archived: true,
  },
  {
    daysAgo: 30,
    name: 'Kevin Park',
    email: 'kpark@fintech.io',
    subject: 'API rate limits',
    message:
      'What are the API rate limits for the Business plan? We expect to make around 100,000 API calls per day. Is there an option to increase limits?',
    is_read: true,
  },
  {
    daysAgo: 35,
    name: 'Maria Garcia',
    email: 'mgarcia@healthcare.org',
    subject: 'HIPAA compliance',
    message:
      "We're in healthcare and need HIPAA-compliant solutions. Is your platform HIPAA certified? Can you provide a BAA (Business Associate Agreement)?",
    is_read: true,
    is_archived: true,
  },
  {
    daysAgo: 40,
    name: 'Chris Taylor',
    email: 'ctaylor@media.com',
    subject: 'Webhook support',
    message:
      'Does your platform support webhooks for real-time event notifications? We need to trigger workflows in our system based on certain events.',
    is_read: true,
  },
  {
    daysAgo: 45,
    name: 'Rachel Green',
    email: 'rgreen@nonprofit.org',
    subject: 'Non-profit pricing',
    message:
      "We're a registered 501(c)(3) non-profit organization. Do you offer special pricing for non-profits? We're working with a limited budget but need your services.",
    is_read: true,
  },
  {
    daysAgo: 50,
    name: 'Daniel Kim',
    email: 'dkim@consulting.com',
    subject: 'Data export formats',
    message:
      'What formats do you support for data exports? We need CSV, JSON, and XML options. Also, is there a way to schedule automated exports?',
    is_read: true,
    is_archived: true,
  },
  {
    daysAgo: 55,
    name: 'Nancy White',
    email: 'nwhite@legal.firm',
    subject: 'Terms of service question',
    message:
      "I'm reviewing your terms of service for our legal team. Can you clarify the data ownership clause? We need to ensure our client data remains our property.",
    is_read: true,
  },
  {
    daysAgo: 60,
    name: 'Peter Jackson',
    email: 'pjackson@manufacturing.com',
    subject: 'Offline capabilities',
    message:
      "Do you have any offline functionality? Our factory floor doesn't always have reliable internet. We need to work offline and sync when connected.",
    is_read: true,
  },
  {
    daysAgo: 65,
    name: 'Laura Miller',
    email: 'lmiller@realestate.com',
    subject: 'Mobile app availability',
    message:
      'Is there a mobile app available for iOS and Android? Our agents are always on the go and need mobile access to the platform.',
    is_read: true,
    is_archived: true,
  },
  {
    daysAgo: 70,
    name: 'George Davis',
    email: 'gdavis@construction.co',
    subject: 'Training and onboarding',
    message:
      'What kind of training do you provide for new users? We have a team of 50 people who will need to be onboarded. Do you offer live training sessions?',
    is_read: true,
  },
  {
    daysAgo: 75,
    name: 'Helen Roberts',
    email: 'hroberts@hospitality.com',
    subject: 'Seasonal pricing',
    message:
      'Our business is highly seasonal. Can we scale up and down our subscription based on demand? We need flexibility during peak and off-peak seasons.',
    is_read: true,
  },
  {
    daysAgo: 80,
    name: 'Alex Turner',
    email: 'aturner@gaming.studio',
    subject: 'Performance benchmarks',
    message:
      'Can you share performance benchmarks? We need sub-100ms response times for our use case. What kind of infrastructure do you use?',
    is_read: true,
    is_archived: true,
  },
  {
    daysAgo: 85,
    name: 'Patricia Adams',
    email: 'padams@insurance.com',
    subject: 'Regulatory compliance',
    message:
      'We operate in multiple states with different regulations. How does your platform help with compliance management across different jurisdictions?',
    is_read: true,
  },
  {
    daysAgo: 90,
    name: 'Steven Clark',
    email: 'sclark@transport.com',
    subject: 'GPS integration',
    message:
      'We need to integrate GPS tracking data. Does your platform support real-time location data ingestion and visualization on maps?',
    is_read: true,
    is_archived: true,
  },
]

async function seedMessages() {
  // Validate environment variables
  const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL
  const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

  if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
    console.error('❌ Turso database is not configured.')
    console.error('   Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your .env file')
    process.exit(1)
  }

  // Create database client
  const client = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  })

  console.log('🌱 Starting to seed messages...')

  try {
    // Prepare batch of insert statements
    const statements = messages.map((msg, index) => {
      const userAgent = userAgents[index % userAgents.length]
      const ipAddress = ipAddresses[index % ipAddresses.length]
      const createdAt = generateDate(msg.daysAgo)

      return {
        sql: `
          INSERT INTO messages (
            name, email, subject, message, ip_address, user_agent,
            is_read, is_archived, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          msg.name,
          msg.email,
          msg.subject || null,
          msg.message,
          ipAddress,
          userAgent,
          msg.is_read === true ? 1 : 0,
          msg.is_archived === true ? 1 : 0,
          createdAt,
          createdAt,
        ],
      }
    })

    // Execute all inserts in a batch transaction
    await client.batch(statements)

    console.log(`✅ Successfully seeded ${messages.length} messages`)
    console.log('📊 Summary:')
    console.log(`   - Unread messages: ${messages.filter(m => !m.is_read).length}`)
    console.log(`   - Read messages: ${messages.filter(m => m.is_read).length}`)
    console.log(`   - Archived messages: ${messages.filter(m => m.is_archived).length}`)
    console.log(
      `   - Date range: ${messages[messages.length - 1].daysAgo} to ${messages[0].daysAgo} days ago`
    )

    // Show a few sample records
    const sampleResult = await client.execute(
      'SELECT id, name, subject, created_at FROM messages ORDER BY created_at DESC LIMIT 3'
    )
    console.log('\n📝 Sample records:')
    for (const row of sampleResult.rows) {
      const date = new Date(row.created_at)
      console.log(
        `   - ID ${row.id}: ${row.name} - "${row.subject}" (${date.toLocaleDateString()})`
      )
    }
  } catch (error) {
    console.error('❌ Error seeding messages:', error.message || error)
    process.exit(1)
  } finally {
    client.close()
  }
}

// Run the seed
seedMessages()
