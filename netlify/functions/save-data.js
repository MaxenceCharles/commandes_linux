// netlify/functions/save-data.js

const REPO_OWNER = 'MaxenceCharles'; // ⚠️ Remplacer par votre nom d'utilisateur GitHub
const REPO_NAME = 'commandes_linux';    // ⚠️ Remplacer par le nom de votre dépôt
const FILE_PATH = 'data.json';             // Chemin du fichier dans le dépôt
const BRANCH = 'main';                      // Nom de votre branche principale ('main' ou 'master')

exports.handler = async (event) => {
  // Accepter uniquement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'TOKEN GitHub non configuré sur Netlify' }) };
  }

  try {
    const newData = JSON.parse(event.body);

    // 1. Récupérer le SHA actuel du fichier data.json sur GitHub (nécessaire pour la mise à jour)
    const fileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const getFileResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Netlify-Function',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getFileResponse.ok) {
      throw new Error(`Erreur lors de la récupération du fichier sur GitHub: ${getFileResponse.statusText}`);
    }

    const fileData = await getFileResponse.json();
    const currentSha = fileData.sha;

    // 2. Encoder le nouveau contenu JSON en Base64
    const contentString = JSON.stringify(newData, null, 2);
    // Utilisation de Buffer (disponible sous Node.js sur Netlify)
    const contentBase64 = Buffer.from(contentString, 'utf-8').toString('base64');

    // 3. Mettre à jour le fichier sur GitHub via un commit
    const updateResponse = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Netlify-Function',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Mise à jour manuelle des commandes [skip ci]',
        content: contentBase64,
        sha: currentSha,
        branch: BRANCH
      })
    });

    if (!updateResponse.ok) {
      const errRes = await updateResponse.json();
      throw new Error(errRes.message || 'Erreur lors du commit sur GitHub');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Données sauvegardées et commitées sur GitHub avec succès !' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};