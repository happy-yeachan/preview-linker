import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { Octokit } from 'octokit'

dotenv.config()
const app = express()
app.use(bodyParser.json())

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
const owner = process.env.GITHUB_OWNER
const repo = process.env.GITHUB_REPO
const branch = 'gh-pages'
const previewPath = 'preview'

app.post('/add-preview', async (req, res) => {
  try {
    const { id, title, desc, image, url } = req.query

    if (!id || !title || !desc || !image || !url) {
      return res.status(400).json({ message: '모든 필드를 query로 전달해주세요.' })
    }

    const filePath = `${previewPath}/${id}.html`

    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta http-equiv="refresh" content="0; url=${url}" />
  <title>${title}</title>
</head>
<body>
  <script>location.href="${url}"</script>
</body>
</html>`

    // check if file already exists
    try {
      const { data: existing } = await octokit.rest.repos.getContent({ owner, repo, path: filePath, ref: branch })
      if (existing && existing.sha) {
        return res.status(409).json({ message: '이미 존재하는 ID입니다.' })
      }
    } catch (err) {
      // not found, continue
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Add preview: ${id}`,
      content: Buffer.from(htmlContent).toString('base64'),
      branch
    })

    const urlPath = `https://${owner}.github.io/${repo}/${filePath}`
    res.json({ message: 'HTML 저장 완료!', link: urlPath })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: '오류 발생' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`)
})
