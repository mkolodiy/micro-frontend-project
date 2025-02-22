interface Microfrontend {
  name: string;
  path: string;
}
const microfrontends: Array<Microfrontend> = [
  {
    name: 'welcome',
    path: 'hello',
  },
  {
    name: 'music',
    path: 'play',
  },
];

function getMicrofrontendName(): string {
  const pathname = window.location.pathname;

  const [, path] = pathname.split('/');
  const match = microfrontends.find(
    (microfrontend) => microfrontend.path === path
  );
  if (!match) {
    throw new Error('Could not find microfrontend config.');
  }
  return match.name;
}

function getMicrofrontendEntrypointUrl(name: string): string {
  return `/mfe/${name}/index.html`;
}

function getMicrofrontend(path: string): Promise<Document> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      resolve(xhr.response);
    };
    xhr.onerror = (error) => {
      reject(error);
    };
    xhr.open('GET', path);
    xhr.responseType = 'document';
    xhr.send();
  });
}

function moveNodeToDocument(parent: HTMLElement, document: Document) {
  return function moveNode(node: Element) {
    // Cloning or Adopting <scripts> nodes doesn't re-evaluate them
    // Read more here: https://stackoverflow.com/questions/28771542/why-dont-clonenode-script-tags-execute
    if (node.tagName === 'SCRIPT') {
      const clonedNode = document.createElement(node.tagName);

      [...node.attributes].forEach((attribute) =>
        clonedNode.setAttribute(attribute.name, attribute.value)
      );
      clonedNode.innerHTML = node.innerHTML;

      parent.appendChild(clonedNode);
      return;
    }

    const adoptedNode = document.adoptNode(node);
    parent.appendChild(adoptedNode);
  };
}

function addOrUpdateBaseTag(microFrontendName: string) {
  const baseElement = document.createElement('base');
  baseElement.setAttribute('href', `/mfe/${microFrontendName}/`);
  document.head.appendChild(baseElement);
}

function mountMicroFrontendInPage(
  microFrontendName: string,
  microFrontendDocument: Document
) {
  addOrUpdateBaseTag(microFrontendName);

  const microFrontendHeadNodes =
    microFrontendDocument.querySelectorAll('head>*');
  const microFrontendBodyNodes =
    microFrontendDocument.querySelectorAll('body>*');

  microFrontendHeadNodes.forEach(moveNodeToDocument(document.head, document));
  microFrontendBodyNodes.forEach(moveNodeToDocument(document.body, document));
}

async function main() {
  try {
    const name = getMicrofrontendName();
    const entrypointUrl = getMicrofrontendEntrypointUrl(name);
    const document = await getMicrofrontend(entrypointUrl);
    mountMicroFrontendInPage(name, document);
  } catch (error) {
    console.log(error);
  }
}

main();
