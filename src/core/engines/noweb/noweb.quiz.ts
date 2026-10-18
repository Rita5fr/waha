import { UnprocessableEntityException } from '@nestjs/common';
import esm from '@waha/vendor/esm';

/**
 * A quiz poll: one answer each, with the right option marked, so whoever votes
 * sees at once whether they were right. WhatsApp sends it as
 * pollCreationMessageV5 with pollType QUIZ, the same message the phone app
 * sends to a channel. Baileys only builds plain polls, so the message is built
 * here and relayed as it is. Channels only.
 */
export async function sendQuizPoll(
  sock: any,
  chatId: string,
  name: string,
  options: string[],
  correctAnswer: string,
  messageId: string,
) {
  if (!esm.b.isJidNewsletter(chatId)) {
    throw new UnprocessableEntityException(
      'poll.correctAnswer (a quiz) can be sent to channels only',
    );
  }
  if (!options.includes(correctAnswer)) {
    throw new UnprocessableEntityException(
      'poll.correctAnswer must be one of poll.options',
    );
  }
  const msg = esm.b.proto.Message.create({
    pollCreationMessageV5: {
      name: name,
      options: options.map((option) => ({ optionName: option })),
      selectableOptionsCount: 1,
      pollType: esm.b.proto.Message.PollType.QUIZ,
      correctAnswer: { optionName: correctAnswer },
    },
  });
  const fullMessage = esm.b.generateWAMessageFromContent(chatId, msg, {
    userJid: sock?.user?.id,
    messageId: messageId,
  });
  await sock.relayMessage(chatId, fullMessage.message, {
    messageId: fullMessage.key.id,
    // As Baileys marks a poll it sends to a channel
    additionalAttributes: { type: 'poll' },
    additionalNodes: [
      { tag: 'meta', attrs: { polltype: 'creation', contenttype: 'text' } },
    ],
  });
  return fullMessage;
}
