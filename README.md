# Editor Svg

Projeto desenvolvido para processo seletivo da vaga de desenvolvedor front-end da Trakto

## Candidata: Gabriela Fraga Moreira Medeiros

Esse projeto renderiza uma área svg na tela sobre a qual é possível adicionar, editar, mover e excluir retângulos ou estrelas. As alterações de edição possíveis incluem cor e espessura da borda, cor do preenchimento, número de pontas das estrelas, curvatura de pontas do triângulo e aumento ou redução de escala proporcional das figuras.

## Decisões de implementação:

Foi decidido não redimensionar o conteúdo do canvas em telas responsivas para preservar a proporção do trabalho do usuário. De forma contrária, as formas criadas poderiam ser distorcidas.

Foi decidido mostras as informações de cada figura no próprio formulário de edição à direita. Assim, o usuário pode ao mesmo tempo ver e alterar as propriedades da figura. Foi utilizado reactive forms para um melhor funcionamento da implementação das alterações em tempo real.

A cobertura de testes está acima de 90%, considerado um valor adequado para manter a estabilidade do projeto. O comando de execução dos testes inclui o parâmetro para mostrar a cobertura.

## Instruções de instalação

Foram utilizadas as versões de Node 22.15.1 e Angular 18.1.0. Certifique-se de tê-los instalados em sua máquina.

Clone o projeto para sua máquina local:

`git clone https://github.com/gabriela-fraga/editor-svg.git`

Navegue para a pasta do projeto, e use o comando seguinte para instalar as dependências:

`npm install`

Para iniciar o projeto, rode o comando:

`npm run start`

Para rodar os testes, use o comando:

`npm run test`

## Contatos da Desenvolvedora

gabyfragamoreiramedeiros@gmail.com
(31) 99856-8440
https://www.linkedin.com/in/gabriela-fraga-medeiros/
