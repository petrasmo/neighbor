// functions/johnDeereSync.js
const axios = require("axios");

const DEERE_CLIENT_ID = "0oay3prpfukTojw365d7";
const DEERE_CLIENT_SECRET = "CFEISPhHXbgV0iU7Wsx3JkWoRhgJt8ObfzzrvhOfrjkGOzeRf13BqgJMt_8cXDt8";
const DEERE_REDIRECT_URI = "https://us-central1-neighborpm-b9968.cloudfunctions.net/johnDeereAuthCallback";

const DEERE_AUTH_URL = "https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize";
const DEERE_TOKEN_URL = "https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token";
const DEERE_API_BASE = "https://sandboxapi.deere.com/platform";

const DEFAULT_CONNECTIONS_URL = `https://connections.deere.com/connections/${DEERE_CLIENT_ID}/select-organizations`;

function getBasicAuthHeader() {
  const creds = Buffer.from(`${DEERE_CLIENT_ID}:${DEERE_CLIENT_SECRET}`).toString("base64");
  return `Basic ${creds}`;
}

function getJohnDeereLoginUrl(userId, originUrl = "https://jurgisagro.com") {
  const statePayload = Buffer.from(JSON.stringify({ uid: userId, origin: originUrl })).toString("base64");
  const scopes = "ag1 ag2 ag3 eq1 files org1 offline_access";
  return `${DEERE_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(
    DEERE_CLIENT_ID
  )}&redirect_uri=${encodeURIComponent(DEERE_REDIRECT_URI)}&scope=${encodeURIComponent(
    scopes
  )}&state=${encodeURIComponent(statePayload)}`;
}

async function exchangeDeereCode(code) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: DEERE_REDIRECT_URI,
  });

  const res = await axios.post(DEERE_TOKEN_URL, params.toString(), {
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    timeout: 12000,
  });

  return res.data;
}

async function getValidDeereToken(db, admin, userId) {
  const secretRef = db.collection("johndeere_secrets").doc(userId);
  const secretDoc = await secretRef.get();
  if (!secretDoc.exists) {
    throw new Error("Vartotojas dar neprijungė John Deere paskyros.");
  }

  const data = secretDoc.data();
  const now = Date.now();

  if (data.accessToken && data.expiresAt && now < data.expiresAt - 60000) {
    return data.accessToken;
  }

  if (!data.refreshToken) {
    throw new Error("Baigėsi John Deere sesija. Prisijunkite iš naujo.");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: data.refreshToken,
    redirect_uri: DEERE_REDIRECT_URI,
  });

  const res = await axios.post(DEERE_TOKEN_URL, params.toString(), {
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    timeout: 12000,
  });

  const newAccess = res.data.access_token;
  const newRefresh = res.data.refresh_token || data.refreshToken;
  const newExpires = now + (res.data.expires_in || 3600) * 1000;

  await secretRef.set(
    {
      accessToken: newAccess,
      refreshToken: newRefresh,
      expiresAt: newExpires,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return newAccess;
}

/**
 * Nuskaito organizacijas, techniką, jos GPS koordinates (locationHistory), moto-valandas, klaidas ir laukus
 */
async function syncJohnDeereData(db, admin, userId) {
  const secretDoc = await db.collection("johndeere_secrets").doc(userId).get();
  if (!secretDoc.exists) {
    return {
      isConnected: false,
      needsOrgConnection: false,
      organizations: [],
      machines: [],
      fields: [],
      connectionsUrl: null,
      manageConnectionsUrl: DEFAULT_CONNECTIONS_URL,
    };
  }

  const token = await getValidDeereToken(db, admin, userId);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.deere.axiom.v3+json",
  };

  let orgs = [];
  let connectionsUrl = null;
  let connectedOrg = null;
  let apiPendingMessage = null;

  try {
    const orgRes = await axios.get(`${DEERE_API_BASE}/organizations`, { headers, timeout: 12000 });
    orgs = orgRes.data?.values || [];

    for (const org of orgs) {
      const links = org.links || [];
      const connLink = links.find((l) => l.rel === "connections");

      if (connLink && connLink.uri) {
        if (!connectionsUrl) connectionsUrl = connLink.uri;
      } else {
        if (!connectedOrg) connectedOrg = org;
      }
    }
  } catch (orgErr) {
    const status = orgErr.response?.status;
    const rawDetail = orgErr.response?.data ? JSON.stringify(orgErr.response.data) : orgErr.message;

    if (status === 403 || status === 401) {
      apiPendingMessage = `OAuth2 prisijungta, bet reikia patvirtinti organizacijos prieigą (HTTP ${status}): ${rawDetail}`;
      connectionsUrl = DEFAULT_CONNECTIONS_URL;
    } else {
      throw new Error(`John Deere Organizations API klaida (${status}): ${rawDetail}`);
    }
  }

  const primaryOrg = connectedOrg || orgs[0] || null;
  const needsOrgConnection = !connectedOrg && (!!connectionsUrl || orgs.length === 0);
  const finalConnectionsUrl = connectionsUrl || (needsOrgConnection ? DEFAULT_CONNECTIONS_URL : null);

  let machines = [];
  let deereFields = [];

  if (primaryOrg && !needsOrgConnection) {
    // 1. Nuskaitome techniką
    try {
      let rawEq = [];
      try {
        const orgMachRes = await axios.get(`${DEERE_API_BASE}/organizations/${primaryOrg.id}/machines`, {
          headers,
          timeout: 10000,
        });
        rawEq = orgMachRes.data?.values || [];
      } catch (e1) {
        const eqRes = await axios.get(`${DEERE_API_BASE}/equipment`, { headers, timeout: 10000 });
        rawEq = eqRes.data?.values || [];
      }

      machines = rawEq.map((m) => ({
        id: m.id,
        name: m.name || m.model?.name || "John Deere Technika",
        vin: m.vin || m.serialNumber || "Nėra VIN",
        make: m.make?.name || "John Deere",
        model: m.model?.name || "8R",
        category: m.category?.name || m.equipmentType?.name || "Tractor",
        isConnected: true,
        engineHours: null,
        distanceKm: null,
        location: null,
        alerts: [],
      }));
    } catch (eqErr) {
      console.warn("Equipment API įspėjimas:", eqErr.response?.status, eqErr.message);
    }

    // 2. Nuskaitome pilną JDLink telemetriją kiekvienai mašinai (Moto-valandos, GPS LocationHistory, Atstumas, Klaidos)
    for (let i = 0; i < machines.length; i++) {
      const mId = machines[i].id;

      // A) Moto-valandos
      try {
        const ehRes = await axios.get(`${DEERE_API_BASE}/machines/${mId}/engineHours`, { headers, timeout: 5000 });
        const val = ehRes.data?.reading?.value ?? ehRes.data?.values?.[0]?.reading?.value;
        if (val !== undefined) {
          machines[i].engineHours = Number(val).toFixed(1);
        }
      } catch (e) {}

      // B) GPS Vieta ir maršruto istorija (locationHistory)
      try {
        const locRes = await axios.get(`${DEERE_API_BASE}/machines/${mId}/locationHistory`, { headers, timeout: 5000 });
        const pts = locRes.data?.values || [];
        if (pts.length > 0) {
          const lastPt = pts[pts.length - 1];
          const lat = Number(lastPt.point?.lat ?? lastPt.lat);
          const lon = Number(lastPt.point?.lon ?? lastPt.lon);
          if (lat && lon) {
            machines[i].location = {
              lat: lat,
              lng: lon,
              heading: Number(lastPt.heading || 0),
              timestamp: lastPt.eventTimestamp || new Date().toISOString(),
              trail: pts
                .slice(-25)
                .map((p) => [Number(p.point?.lat ?? p.lat), Number(p.point?.lon ?? p.lon)])
                .filter((c) => c[0] && c[1]),
            };
          }
        }
      } catch (e) {}

      // C) Nuvažiuotas atstumas (distanceTraveled)
      try {
        const distRes = await axios.get(`${DEERE_API_BASE}/machines/${mId}/distanceTraveled`, { headers, timeout: 5000 });
        const dVal = distRes.data?.reading?.value ?? distRes.data?.values?.[0]?.reading?.value;
        if (dVal !== undefined) {
          machines[i].distanceKm = Number(dVal).toFixed(1);
        }
      } catch (e) {}

      // D) DTC Klaidos / Įspėjimai (alerts)
      try {
        const alRes = await axios.get(`${DEERE_API_BASE}/machines/${mId}/alerts`, { headers, timeout: 5000 });
        const rawAlerts = alRes.data?.values || [];
        machines[i].alerts = rawAlerts.slice(0, 5).map((a) => ({
          severity: a.severity || "INFO",
          message: a.definition?.description || a.message || "Diagnostikos pranešimas",
          time: a.time || "",
        }));
      } catch (e) {}
    }

    // 3. Nuskaitome organizacijos laukus
    try {
      const fRes = await axios.get(`${DEERE_API_BASE}/organizations/${primaryOrg.id}/fields`, {
        headers,
        timeout: 10000,
      });
      deereFields = (fRes.data?.values || []).map((f) => ({
        id: f.id,
        name: f.name,
        archived: !!f.archived,
      }));
    } catch (fErr) {
      console.warn("Fields API įspėjimas:", fErr.response?.status, fErr.message);
    }
  }

  await db.collection("user_smart_devices").doc(`johndeere_${userId}`).set(
    {
      id: `johndeere_${userId}`,
      userId: userId,
      type: "tractor_cloud",
      brand: "johndeere",
      name: primaryOrg ? `John Deere (${primaryOrg.name})` : "John Deere Operations Center",
      telemetry: {
        isConnected: true,
        needsOrgConnection: needsOrgConnection,
        organizationId: primaryOrg?.id || null,
        organizationName: primaryOrg?.name || null,
        connectionsUrl: finalConnectionsUrl,
        machines: machines,
        fieldsCount: deereFields.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    isConnected: true,
    needsOrgConnection: needsOrgConnection,
    apiPendingMessage: apiPendingMessage,
    organization: primaryOrg ? { id: primaryOrg.id, name: primaryOrg.name } : null,
    organizations: orgs.map((o) => ({ id: o.id, name: o.name })),
    connectionsUrl: finalConnectionsUrl,
    manageConnectionsUrl: DEFAULT_CONNECTIONS_URL,
    machines: machines,
    fields: deereFields,
  };
}

/**
 * Sukuria JurgisAgro lauką + jo GPS ribas (Boundary) John Deere Operations Center sistemoje!
 */
async function pushFieldsToJohnDeere(db, admin, userId, orgId, fieldsList) {
  const token = await getValidDeereToken(db, admin, userId);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.deere.axiom.v3+json",
    "Content-Type": "application/vnd.deere.axiom.v3+json",
  };

  let existingNames = new Set();
  try {
    const exRes = await axios.get(`${DEERE_API_BASE}/organizations/${orgId}/fields`, { headers, timeout: 10000 });
    (exRes.data?.values || []).forEach((f) => existingNames.add((f.name || "").toLowerCase()));
  } catch (e) {}

  let createdCount = 0;
  let skippedCount = 0;

  for (const f of fieldsList) {
    if (!f.name || existingNames.has(f.name.toLowerCase())) {
      skippedCount++;
      continue;
    }

    try {
      const createFieldRes = await axios.post(
        `${DEERE_API_BASE}/organizations/${orgId}/fields`,
        { name: f.name, archived: false },
        { headers, timeout: 10000 }
      );

      const newFieldLocation = createFieldRes.headers?.location;
      const coords = f.polygonCoordinates || [];

      if (newFieldLocation && coords.length >= 3) {
        const ringPoints = coords.map((p) => ({
          "@type": "Point",
          lat: Number(Array.isArray(p) ? p[0] : p.lat),
          lon: Number(Array.isArray(p) ? p[1] : p.lng),
        }));
        ringPoints.push(ringPoints[0]);

        await axios.post(
          `${newFieldLocation}/boundaries`,
          {
            name: `${f.name} riba`,
            sourceType: "External",
            active: true,
            irrigated: false,
            multipolygons: [
              {
                "@type": "Polygon",
                rings: [{ "@type": "Ring", points: ringPoints, type: "exterior" }],
              },
            ],
          },
          { headers, timeout: 10000 }
        );
      }

      createdCount++;
    } catch (err) {
      console.warn(`Nepavyko sukurti lauko ${f.name} John Deere:`, err.response?.data || err.message);
    }
  }

  return { createdCount, skippedCount };
}

/**
 * Įkelia VRA Shapefile .ZIP failą tiesiai į John Deere Files API (belaidžiam perdavimui į traktorių!)
 */
async function uploadVraZipToJohnDeere(db, admin, userId, orgId, { fileName, zipBase64, fieldName, taskType, baseRate }) {
  const token = await getValidDeereToken(db, admin, userId);

  const metaRes = await axios.post(
    `${DEERE_API_BASE}/organizations/${orgId}/files`,
    {
      name: fileName,
      type: "PRESCRIPTION",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.deere.axiom.v3+json",
        "Content-Type": "application/vnd.deere.axiom.v3+json",
      },
      timeout: 12000,
    }
  );

  const fileLocation = metaRes.headers?.location;
  if (!fileLocation) {
    throw new Error("John Deere Files API negrąžino failo įkėlimo adreso.");
  }

  const fileBuffer = Buffer.from(zipBase64, "base64");
  await axios.put(fileLocation, fileBuffer, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    timeout: 20000,
  });

  const taskRef = db.collection("johndeere_tasks").doc();
  const taskRecord = {
    id: taskRef.id,
    userId: userId,
    orgId: orgId,
    fileName: fileName,
    fieldName: fieldName,
    taskType: taskType,
    baseRate: baseRate,
    deereFileUrl: fileLocation,
    status: "uploaded_to_deere",
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await taskRef.set(taskRecord);

  return taskRecord;
}

module.exports = {
  getJohnDeereLoginUrl,
  exchangeDeereCode,
  syncJohnDeereData,
  pushFieldsToJohnDeere,
  uploadVraZipToJohnDeere,
};