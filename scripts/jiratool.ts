const { program } = require("commander");
// const fetch = require("node-fetch");

interface autoconsentBrokenTicketArgs {
  email: string;
  token: string;
  type: string;
  summary: string;
  description: string;
  brokenSites: string[];
}

enum ISSUE_TYPES {
  BUG = '10009',
  STORY = '10006'
}

async function createAutoconsentBrokenTicket(sites: string[], {
  email,
  token
}: autoconsentBrokenTicketArgs) {
  const siteRegex = /.+? > (.+?) .*/;
  const siteUrls = sites.map(site => {
    const match = site.match(siteRegex);

    if (!match) {
      return null;
    }

    const [_, url] = match;
    return url;
  }).filter(Boolean);

  const summary = 'autoconsent broken on ' + siteUrls.join(', ');

  console.log('summary', summary);

  // const body = {
  //   fields: {
  //     issuetype: {
  //       id: ISSUE_TYPES.BUG,
  //     },
  //     parent: {
  //       key: "DES-939"
  //     },
  //     project: {
  //       id: "10007"
  //     },
  //     assignee: {
  //       id: '63e3c876010d35637974bb68',
  //     },
  //     summary,
  //     description: {
  //       content: [
  //         {
  //           content: [
  //             {
  //               text: "Autoconsent broken on the following websites:\n" + siteUrls.map(url => `\t- ${url}`).join('\n'),
  //               type: "text",
  //             },
  //           ],
  //           type: "paragraph",
  //         },
  //       ],
  //       type: "doc",
  //       version: 1,
  //     },
  //   },
  // };

  // const request = {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString(
  //       "base64"
  //     )}`,
  //     Accept: "application/json",
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify(body),
  // };

  // const response = await fetch(
  //   `https://tempest-tech.atlassian.net/rest/api/3/issue`,
  //   request
  // );
  // const responseText = (await response.text()) || "{}";
  // const status = `${response.status} ${response.statusText}: ${responseText}`;

  // if (response.ok) {
  //   return JSON.parse(responseText);
  // }

  // throw new Error(status);
}

async function queryIssue(options: { id: string; email: string; token: string }) {
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
