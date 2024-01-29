const { program } = require("commander");

const BUG_ISSUE_TYPE = '10009';

async function createAutoconsentBrokenTicket(sites, {
  email,
  token
}) {
  const { default: fetch } = await import('node-fetch');
  const siteRegex = /.+? > (.+?) .*/;
  const siteUrls = sites.map(site => {
    const match = site.match(siteRegex);

    if (!match) {
      return null;
    }

    const [_, url] = match;
    return url;
  }).filter(Boolean);

  const summary = 'Autoconsent broken on ' + siteUrls.join(', ');

  const body = {
    fields: {
      issuetype: {
        id: BUG_ISSUE_TYPE,
      },
      parent: {
        key: "DES-939"
      },
      project: {
        id: "10007"
      },
      assignee: {
        id: '63e3c876010d35637974bb68',
      },
      summary,
      description: {
        content: [
          {
            content: [
              {
                text: "Autoconsent broken on the following websites:\n" + siteUrls.map(url => `\t- ${url}`).join('\n'),
                type: "text",
              },
            ],
            type: "paragraph",
          },
        ],
        type: "doc",
        version: 1,
      },
    },
  };

  const request = {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString(
        "base64"
      )}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };

  const response = await fetch(
    `https://tempest-tech.atlassian.net/rest/api/3/issue`,
    request
  );
  const responseText = (await response.text()) || "{}";
  const status = `${response.status} ${response.statusText}: ${responseText}`;

  if (response.ok) {
    return JSON.parse(responseText);
  }

  throw new Error(status);
}

async function queryIssue(options) {
  const { id, email, token } = options;

  const request = {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(`https://tempest-tech.atlassian.net/rest/api/3/issue/${id}`, request);
  const responseText = (await response.text()) || '{}';
  const status = `${response.status} ${response.statusText}: ${responseText}`;

  if (response.ok) {
    console.log('issue', JSON.parse(responseText));
    return JSON.parse(responseText);
  }

  console.log('ERROR', status);

  throw new Error(status);
}

program
  .command('query')
  .requiredOption('--id <ticket_id>', 'ticket id')
  .requiredOption('--email <user_email>', 'user email')
  .requiredOption('--token <user_token>', 'user token')
  .action(queryIssue);

program
  .command("create-autoconsent-ticket [broken-websites...]")
  .requiredOption("--email <user_email>", "user email")
  .requiredOption("--token <user_token>", "user_token")
  .action(createAutoconsentBrokenTicket);

program.parseAsync();
